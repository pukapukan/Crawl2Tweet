'use strict';

var mongo = require('mongodb'),
    jsdom = require('jsdom'),
    async = require('async'),
    Twitter = require('easy-tweet'),
    Q = require('q');

var isFunction = function isFunction(f) {
  return f && typeof(f) === 'function';
};

var promiseCallback = function promiseCallback (reject, resolve) {
  return function (err, result) {
    if(err) reject(err);
    else resolve(result);
  };
};

var getMongoCollection = function getMongoCollection(dbUrl, collectionName) {
  return Q.Promise(function (resolve, reject) {
    mongo.MongoClient.connect(dbUrl, { native_parser:true }, function(err, db) {
      db.collection(collectionName, promiseCallback(reject, resolve));
    });
  });
};

var loadWindow = function loadWindow(url) {
  return Q.Promise(function (resolve, reject) {
    jsdom.env({
      url: url,
      done: function (err, window) {
        if (err) reject(err);
        else {
          jsdom.jQueryify(window, 'http://code.jquery.com/jquery-2.1.1.js', function () {
            resolve(window);
          });
        }
      }
    });
  });
};

var loadPages = function loadPages(pages) {
  return Q.Promise(function (resolve, reject) {
    async.mapSeries(pages, function (page, done) {
      loadWindow(page.url).then(function (window) {
        done(null, {
          window: window,
          query: page.query
        });
      })
    }, function (err, results) {
      if(err) reject(err);
      else resolve([collection, results]);
    });
  });
};

var queryPages = function queryPages(collection, pages) {
  return Q.Promise(function(resolve, reject) {
    async.map(pages, function (page, done) {
      page.query(page.window, function (items) {
        page.window.close();
        done(items);
      });
    }, function(err, results) {
      if (err) reject(err);
      else resolve(results);
    });
  });
};

var getItemCount = function getItemCount(collection, identifier) {
  return Q.Promise(function (resolve, reject) {
    collection.count({ identifier: identifier }, promiseCallback(resolve, reject));
  })
};

var saveAndTweet = function saveAndTweet(collection, twitterClient, identifier, content) {
  return Q.Promise(function (resolve, reject) {
    var newRecord = {
      identifier: identifier,
      content: content
    };

    collection.insert(newRecord, function(err, result){
      if(err) {
        reject(err);
      } else {
        twitterClient.tweet(content);
        resolve();
      }
    });
  });
};

var processQueryResults = function processQueryResults(results, collection, twitterClient) {
  return Q.Promise(function(resolve, reject) {
    var itemIterator = function (item, done) {
      var id = item.identifier;
      var content = item.content;

      getItemCount(collection, id).then(function (count) {
        if(count === 0) {
          saveAndTweet(collection, twitterClient, id, content).then(done);
        } else {
          done();
        }
      });
    };

    var pageIterator = function (pageItems, done){
      async.each(pageItems, itemIterator, done);
    };

    async.each(results, pageIterator, promiseCallback(resolve, reject));
  });
};

var throwError = function (exitOnError) {
  return function throwError(err) {
    console.error('something went wrong', err);
    if (exitOnError) {
      process.exit(-1);
    }
  };
};

// options = {
//   interval: milliseconds, -- default: 0, any value less than or equal to 0 will not trigger the crawler to run periodically
//   exitOnError: boolean, -- default: false
//   mongoDB: {
//     url: string,
//     collection: string
//   },
//   twitter: {
//     api_key: string,
//     api_secret: string,
//     access_token: string,
//     access_token_secret: string
//   },
//   pages: [
//     {
//       url: string,
//       query: function(window, callback) -- custom callback to customise query page and filter items to tweet.  the callback function is expected to return an array of object which consists of 'identifier' and 'content' properties.  'identifier' will be used as a key in the MongoDB collection and content will be tweet if its identifier doesn not exist in the collection.
//     }
//   ]
// }

module.exports = function(options) {
  var twitterClient = new Twitter(
    options.twitter.api_key,
    options.twitter.api_secret,
    options.twitter.access_token,
    options.twitter.access_token_secret
  );

  var crawl = function crawl() {
    var dbOptions = options.mongoDB;

    var promisedPagesQueries = loadPages(options.pages).then(queryPages);
    var promisedCollection = getMongoCollection(dbOptions.url, dbOptions.collection);
    var promisedTwitter = Q.fcall(function() { return twitterClient; });

    Q.all([
        promisedPagesQueries,
        promisedCollection,
        promisedTwitter
      ])
      .spread(processQueryResults)
      .catch(throwError(options.exitOnError));
  };

  // schedule crawler
  var interval = parseInt(options.interval);
  if(interval > 0) {
    setInterval(crawl, interval)
  }

  // start crawling when the app starts
  crawl();
}

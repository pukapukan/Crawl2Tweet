'use strict';

var mongo = require('mongodb'),
    jsdom = require('jsdom'),
    async = require('async'),
    Twitter = require('easy-tweet'),
    Q = require('q');

var promiseCallback = function promiseCallback (reject, resolve) {
  return function (err, result) {
    if(err) reject(err);
    else resolve(result);
  };
};

var getMongoCollection = function getMongoCollection(url, collectionName) {
  return Q.Promise(function (resolve, reject) {
    mongo.MongoClient.connect(url, { native_parser:true }, function(err, db) {
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
      else resolve(results);
    });
  });
};

var queryPages = function queryPages(pages) {
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

var saveAndTweet = function saveAndTweet(collection, twitterClient, item) {
  return Q.Promise(function (resolve, reject) {

    collection.insert(item, function(err, result){
      if(err) {
        reject(err);
      } else {
        twitterClient.tweet(item);
        resolve();
      }
    });
  });
};

var processQueryResults = function processQueryResults(results, collection, twitterClient) {
  return Q.Promise(function(resolve, reject) {
    var processResult = function (item, done) {
      var id = item.identifier;

      getItemCount(collection, id).then(function (count) {
        if(count === 0) {
          saveAndTweet(collection, twitterClient, item).then(done);
        } else {
          done();
        }
      });
    };

    // iterate over query results from a page
    var pageResultIterator = function (pageItems, done){
      async.each(pageItems, processResult, done);
    };

    // iterate over query results
    async.each(results, pageResultIterator, promiseCallback(resolve, reject));
  });
};

// options = {
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
//       query: function(window, callback)
//     }
//   ]
// }
var Crawler = function (options) {
  var _twitterClient = new Twitter(
    options.twitter.api_key,
    options.twitter.api_secret,
    options.twitter.access_token,
    options.twitter.access_token_secret
  );

  Object.defineProperties(this, {
    options: {
      value: options
    },
    twitterClient: {
      value: _twitterClient
    }
  });
};

Crawler.prototype.run = function() {
  var options = this.options;
  var twitterClient = this.twitterClient;

  var getQueryResults = loadPages(options.pages).then(queryPages);
  var getCollection = getMongoCollection(options.dbOptions.url, options.dbOptions.collection);
  var getTwitterClient = Q.fcall(function() { return twitterClient; });

  return Q.all([ getQueryResults, getCollection, getTwitterClient ])
          .spread(processQueryResults);
};

module.exports = Crawler;

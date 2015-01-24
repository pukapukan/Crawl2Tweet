'use strict';

var mongo = require('mongodb'),
    jsdom = require('jsdom'),
    async = require('async'),
    Twitter = require('easy-tweet'),
    Q = require('q');

var promiseCallback = function (reject, resolve) {
  return function (err, result) {
    if(err) reject(err);
    else resolve(result);
  };
};

var getMongoCollection = function (url, collectionName) {
  return Q.Promise(function (resolve, reject) {
    mongo.MongoClient.connect(url, { native_parser:true }, function(err, db) {
      db.collection(collectionName, promiseCallback(reject, resolve));
    });
  });
};

var loadWindow = function (url) {
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

var queryPages = function (pages) {
  return Q.Promise(function (resolve, reject) {
    async.mapSeries(pages, function (page, done) {
      loadWindow(page.url).then(function (window) {
        page.query(window, function (items) {
          window.close();
          done(null, items)
        });
      })
    }, function (err, results) {
      if(err) reject(err);
      else resolve(results);
    });
  });
};

var getItemCount = function (collection, identifier) {
  return Q.Promise(function (resolve, reject) {
    collection.findOne({ identifier: identifier }, promiseCallback(resolve, reject));
  })
};

var saveAndTweet = function (collection, twitterClient, item) {
  return Q.Promise(function (resolve, reject) {

    collection.insert(item, function(err, result){
      if(err) {
        reject(err);
      } else {
        twitterClient.tweet(item.content);
        resolve();
      }
    });
  });
};

var processQueryResults = function (results, collection, twitterClient) {
  return Q.Promise(function(resolve, reject) {
    var processResult = function (item, done) {
      var id = item.identifier;

      collection.findOne({ identifier: id }, function (err, doc) {
        if(!doc) {
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

    var closeDB = function (err) {
      if(err) {
        reject(err);
      }
      collection.db.close();
      resolve();
    }

    // iterate over query results
    async.each(results, pageResultIterator, closeDB);
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

  var getQueryResults = queryPages(options.pages);
  var getCollection = getMongoCollection(options.mongoDB.url, options.mongoDB.collection);
  var getTwitterClient = Q.fcall(function() { return twitterClient; });

  return Q.all([ getQueryResults, getCollection, getTwitterClient ])
          .spread(processQueryResults);
};

module.exports = Crawler;

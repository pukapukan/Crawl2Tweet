'use strict';

var mongo = require('mongodb'),
    jsdom = require('jsdom'),
    async = require('async'),
    Twitter = require('easy-tweet');

var getMongoCollection = function (url, collectionName) {
  return function (callback) {
    mongo.MongoClient.connect(url, { native_parser:true }, function(err, db) {
      db.collection(collectionName, callback);
    });
  };
};

var loadWindow = function (url) {
  return function (callback) {
    jsdom.env({
      url: url,
      done: function (err, window) {
        if (err) callback(err);
        else {
          jsdom.jQueryify(window, 'http://code.jquery.com/jquery-2.1.1.js', function () {
            callback(null, window);
          });
        }
      }
    });
  };
};

var queryPages = function (pages) {
  return function (callback) {
    async.mapSeries(pages, function (page, done) {
      loadWindow(page.url).then(function (window) {
        page.query(window, function (items) {
          window.close();
          done(null, items)
        });
      })
    }, callback);
  };
};

var saveAndTweet = function (collection, twitterClient, item) {
  return function (callback) {
    collection.insert(item, function(err, result){
      twitterClient.tweet(item.content);
      callback(err);
    });
  };
};

var processQueryResults = function (err, results) {
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
    collection.db.close();
    callback(err);
  }

  // iterate over query results
  async.each(results, pageResultIterator, closeDB);
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
  var getTwitterClient = function() { return twitterClient; };

  async.parallel([ getQueryResults, getCollection, getTwitterClient ], processQueryResults);
};

module.exports = Crawler;

'use strict';

var mongo = require('mongodb'),
    jsdom = require('jsdom'),
    async = require('async'),
    Twitter = require('easy-tweet'),
    Q = require('q');

var getMongoCollection = function getMongoCollection(dbUrl, collectionName) {
  return new Q.Promise(function (resolve, reject) {
    mongo.MongoClient.connect(dbUrl, { native_parser:true }, function(err, db) {
      db.collection(collectionName, function(err, collection){
        if(err) reject(err);
        else resolve(collection);
      });
    });
  });
};

var loadDom = function loadDom(url) {
  return new Q.Promise(function (resolve, reject) {
    jsdom.env({
      url: options.url,
      scripts: [ "http://code.jquery.com/jquery.min.js" ],
      done: function (err, window) {
        if(err) reject(err);
        else resolve(window);
      }
    });
  });
}

var isFunction = function isFunction(f) {
  return f && typeof(f) === "function";
};

var getItemCount = function getItemCount(collection, identifier) {
  return new Q.Promise(function (resolve, reject) {
    collection.count({ identifier: identifier }, function(err, count){
      if(err) reject(err);
      else resolve(count);
    });
  })
};

var saveAndTweet = function saveAndTweet(collection, identifier, content) {
  return new Q.Promise(function (resolve, reject) {
    var newRecord = {
      identifier: identifier,
      content: content
    };

    collection.insert(newRecord, function(err, result){
      if(err) reject(err);
      else {
        twitter.tweet(item.content);
        resolve();
      }
    });
  });
};

// options = {
//   interval: number, -- in milliseconds
//   url: string,
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
//   retrieveList: function(window, callback)
// }

module.exports = function(options) {
  var interval = parseInt(options.interval),
      twitter = new Twitter(
        options.twitter.api_key,
        options.twitter.api_secret,
        options.twitter.access_token,
        options.twitter.access_token_secret
      );

  if(interval > 0) {
    setInterval(run, interval)
  }
  run();

  function run() {
    var dbOptions = options.mongoDB;
    var retrieveList = options.retrieveList;

    Q.all([
        getMongoCollection(dbOptions.url, dbOptions.collection),
        loadDom(options.url)])
      .spread(function(collection, window) {
        retrieveList(window, function(items){
          async.each(items, function(item, done){
            var id = item.identifier;
            var content = item.content;

            getItemCount(collection, id)
              .then(function (count) {
                if(count === 0) {
                  saveAndTwee(collection, id, content).then(done);
                } else {
                  done();
                }
              });
          });
        });
      });
  }


}

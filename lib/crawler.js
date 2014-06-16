'use strict';

var mongo = require('mongodb'),
    jsdom = require('jsdom'),
    async = require('async'),
    Twitter = require('./twitter').Twitter;

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
//   retrieveList: function(window);
//   done: function(err, twitted)
// }

module.exports = Crawler;

function Crawler(options) {
  var interval = parseInt(options.interval);
  if(isNaN(interval)){
    return options.done("interval (in milliseconds) must be provided");
  }

  if(interval > 0){
    setInterval(run, interval)
  }

  run();

  function run(){
    var twitter = new Twitter(
      options.twitter.api_key,
      options.twitter.api_secret,
      options.twitter.access_token,
      options.twitter.access_token_secret
    );

    mongo.MongoClient.connect(options.mongoDB.url, { native_parser:true }, function(err, db) {
      db.collection(options.mongoDB.collection, function(err, collection){
        jsdom.env({
          url: options.url,
          scripts: [ "http://code.jquery.com/jquery.min.js" ],
          done: function(err, window){
            if(err){
              return options.done(err);
            }

            options.retrieveList(window, function(itemList){
              var twitted = [];

              try{
                async.each(itemList, function(item, callback){
                  collection.count({ identifier: item.identifier }, function(err, count){
                    if(err) {
                      throw new MongoException(err);
                    }

                    if(count === 0){
                      collection.insert({ identifier: item.identifier, content: item.content }, function(err, result){
                        if(err) {
                          throw new MongoException(err);
                        }

                        twitter.tweet(item.content);
                        twitted.push(item);

                        callback();
                      });
                    }
                  });
                });
              } catch (ex) {
                return options.done(ex.error);
              }

              if(options.done && typeof(options.done) === "function"){
                options.done(null, twitted);
              }
            });
          }
        });
      });
    });
  }
}

function MongoException(error){
  this.error = error;
  this.toString = this.error.toString;
}

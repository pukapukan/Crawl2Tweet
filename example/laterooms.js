'use strict';

var Crawler = require('../crawler'),
    bitly = require('easy-bitly'),
    async = require('async'),
    bitlyAccessToken = process.env.bitlyToken || '<bitly access token>';

// To tweet title + shortened link of article on engineering.laterooms.com
var retrieveLits = function (window, callback){
  var document = window.document;
  var $ = window.$;

  $(document).ready(function(){
    var funcs = [];

    var toTweet =
      $('h1 > a').map(function(index, elem){
        var link = elem.href;
        var content = elem.textContent.trim();
        return { link: link , content: content };
      });

    toTweet.each(function(index, item){
      funcs.push(function(asyncCallback){
        bitly.shorten(item.link, bitlyAccessToken, function(error, result){
          var shortUrl = result.data.url.replace('http://', '');
          var toTweet = { identifier: item.link, content: item.content + ' ' + shortUrl };

          asyncCallback(null, toTweet);
        })
      })
    });

    async.parallel(
      funcs,
      function(err, results){
        callback(results);
      }
    );
  });
};

var options = {
  mongoDB: {
    url:                 process.env.mongoUrl || '<mongodb connection url>',
    collection:          process.env.collection || '<mongodb collection>'
  },
  twitter: {
    api_key:             process.env.twitterApi || '<twitter api key>',
    api_secret:          process.env.twitterApiSecret || '<twitter api secret>',
    access_token:        process.env.twitterToken || '<twitter access token>',
    access_token_secret: process.env.twitterTokenSecret || '<twitter access seret>'
  },
  pages: [{
    url:                  'http://engineering.laterooms.com',
    query:                retrieveLits
  }]
};

var crawler = new Crawler(options);
var run = function() {
  crawler.run().catch(function(error) {
    if (error) {
      console.error('boom!', error);
    }
  });
};

// crawl every 1 hour
var interval = 1000 * 60 * 60;
setInterval(run, interval);

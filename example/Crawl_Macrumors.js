'use strict';

var Crawler = require('../crawler'),
    bitly = require('easy-bitly'),
    async = require('async');

var retrieveLits = function retrieveLits(window, callback){
  /*
  * To tweet title and shortened link to article
  */

  var document = window.document;
  var $ = window.$;
  var bitlyAccessToken = "bitly access token";

  $(document).ready(function(){
    var funcs = [];

    var toTweet =
    $('.article .title>a').map(function(index, elem){
      var title = $(elem);
      var link = title.attr('href');
      var content = title.text().trim();
      return { link: link , content: content };
    });

    toTweet.each(function(index, item){
      funcs.push(function(asyncCallback){
        bitly.shorten(item.link, bitlyAccessToken, function(error, result){
          var shortUrl = result.data.url.replace("http://", "");
          var toTweet = { identifier: item.link, content: item.content + " " + shortUrl };

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

Crawler({
  interval:               300000,  // 5 minutes
  url:                   "http://www.macrumors.com",
  mongoDB: {
    url:                 'your mongodb connection URL',
    collection:          "macrumors"
  },
  twitter: {
    api_key:             "twitter API key",
    api_secret:          "twitter API secret",
    access_token:        "twitter access token",
    access_token_secret: "twitter access token secret"
  },
  retrieveList:          retrieveLits
});

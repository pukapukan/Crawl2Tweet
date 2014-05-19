'use strict';

var OAuth = require('oauth');

module.exports.Twitter = function Twitter(key, secret, token, tokenSecret) {
  this._oAuth = new OAuth.OAuth(
    "http://twitter.com/oauth/request_token",
    "http://twitter.com/oauth/access_token",
    key,
    secret,
    "1.0A",
    null,
    "HMAC-SHA1"
  );
  this._token = token;
  this._tokenSecret = tokenSecret;
};

module.exports.Twitter.prototype.tweet = function(message, option, cb) {
  var param = { "status": message };

  for(var key in option) {
	   param[key] = option[key];
	}

	this._oAuth.post(
    "https://api.twitter.com/1.1/statuses/update.json",
    this._token,
    this._tokenSecret,
    param,
    function(error, data) {
      console.log("twitter: ", message, error, data);
      if(cb && typeof(cb) === "function"){
        cb(error, JSON.parse(data));
      }
    });
  };

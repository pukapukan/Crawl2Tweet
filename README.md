Crawl2Tweet
===========

It's a simple crawl bot implementation to help you tweet new articles from a specific website.

How to use it
-------------

Options:
{
  interval: number, -- milliseconds
  url: string,
  mongoDB: {
    url: string,
    collection: string
  },
  twitter: {
    api_key: string,
    api_secret: string,
    access_token: string,
    access_token_secret: string
  },
  retrieveList: function(err, window.jQuery, callback)
  done: function(err, twittedArticles)
}

TODO:
- [ ] Update Readme.md
- [ ] Add comments to code
- [ ] Publish on blog

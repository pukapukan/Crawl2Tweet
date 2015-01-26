Crawl2Tweet
===========

It's a simple crawler that tweets new articles from webpages.

Check out [example/laterooms.js](https://github.com/pukapukan/Crawl2Tweet/blob/master/example/laterooms.js) for more.

Options:
-----

```
{
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
  pages: [
    {
      url: string,
      query: function(window, callback)
    }
  ]
}

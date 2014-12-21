Crawl2Tweet
===========

It's a simple crawler to tweet new articles from a specific website.

Refer to [example/macrumors.js](https://github.com/pukapukan/Crawl2Tweet/blob/master/example/macrumors.js) to gresp a concept.

Options:
-----

```
{
  interval: number, -- default: 0, any value less than or equal to 0 will not trigger the crawler to run periodically
  exitOnError: boolean, -- default: false
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
      query: function(window, callback) -- custom callback to customise query page and filter items to tweet.  the callback function is expected to return an array of object which consists of 'identifier' and 'content' properties.  'identifier' will be used as a key in the MongoDB collection and content will be tweet if its identifier doesn not exist in the collection.
    }
  ]
}
```

TODO
----
- [ ] Update Readme.md
- [ ] Add comments to code
- [ ] Publish on blog

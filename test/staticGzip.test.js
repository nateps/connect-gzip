var assert = require('assert'),
    should = require('should'),
    fs = require('fs'),
    path = require('path'),
    connect = require('connect'),
    gzip = require('../index'),
    
    fixturesPath = __dirname + '/fixtures',
    
    gzipCss = connect.createServer(
      gzip.staticGzip(fixturesPath, { extensions: ['.css'] })
    ),
    gzipHtml = connect.createServer(
      gzip.staticGzip(fixturesPath, { extensions: ['.html'] })
    );

module.exports = {
  'test no Accept-Encoding': function() {
    assert.response(gzipCss,
      { url: '/style.css' },
      function(res) {
        res.statusCode.should.equal(200);
        res.body.should.equal('body { font-size: 12px; color: red; }');
        res.headers['content-type'].should.match(/text\/css/);
        res.headers.should.not.have.property('content-encoding');
      }
    );
  },
  'test does not accept gzip': function() {
    assert.response(gzipCss,
      { url: '/style.css', headers: { 'Accept-Encoding': 'deflate' } },
      function(res) {
        res.statusCode.should.equal(200);
        res.body.should.equal('body { font-size: 12px; color: red; }');
        res.headers['content-type'].should.match(/text\/css/);
        res.headers.should.not.have.property('content-encoding');
      }
    );
  },
  'test non-compressable': function() {
    assert.response(gzipCss,
      { url: '/', headers: { 'Accept-Encoding': 'gzip' } },
      function(res) {
        res.statusCode.should.equal(200);
        res.body.should.equal('<p>Wahoo!</p>');
        res.headers['content-type'].should.match(/text\/html/);
        res.headers.should.not.have.property('content-encoding');
      }
    );
  },
  'test compressable multiple Accept-Encoding types': function() {
    assert.response(gzipCss,
      { url: '/style.css', headers: { 'Accept-Encoding': 'deflate,gzip,sdch' } },
      function(res) {
        res.statusCode.should.equal(200);
        res.body.should.not.equal('body { font-size: 12px; color: red; }');
        res.body.length.should.be.above(0);
        res.headers['content-type'].should.match(/text\/css/);
        res.headers.should.have.property('content-encoding', 'gzip');
        res.headers['vary'].should.match(/Accept-Encoding/);
      }
    );
  },
  'test compressable index.html': function() {
    assert.response(gzipHtml,
      { url: '/', headers: { 'Accept-Encoding': 'gzip' } },
      function(res) {
        res.statusCode.should.equal(200);
        res.body.should.not.equal('<p>Wahoo!</p>');
        res.body.length.should.be.above(0);
        res.headers['content-type'].should.match(/text\/html/);
        res.headers.should.have.property('content-encoding', 'gzip');
        res.headers['vary'].should.match(/Accept-Encoding/);
      }
    );
  }
}

var assert = require('assert'),
    should = require('should'),
    fs = require('fs'),
    http = require('http'),
    path = require('path'),
    EventEmitter = require('events').EventEmitter,
    spawn = require('child_process').spawn,
    connect = require('connect'),
    gzip = require('../index'),
    
    fixturesPath = __dirname + '/fixtures',
    
    gzipCss = connect.createServer(
      gzip.staticGzip(fixturesPath, { extensions: ['.css'] })
    );

module.exports = {
  'test no Accept-Encoding': function() {
    assert.response(gzipCss, {
        url: '/style.css'
      }, {
        status: 200,
        body: 'body { font-size: 12px; color: red; }',
        headers: { 'Content-Type': /text\/css/ }
      },
      function(res) {
        res.headers.should.not.have.property('content-encoding');
      }
    );
  },
  'test does not accept gzip': function() {
    assert.response(gzipCss, {
        url: '/style.css',
        headers: { 'Accept-Encoding': 'deflate' }
      }, {
        status: 200,
        body: 'body { font-size: 12px; color: red; }',
        headers: { 'Content-Type': /text\/css/ }
      },
      function(res) {
        res.headers.should.not.have.property('content-encoding');
      }
    );
  },
  'test non-compressable': function() {
    assert.response(gzipCss, {
        url: '/',
        headers: { 'Accept-Encoding': 'gzip' }
      }, {
        status: 200,
        body: '<p>Wahoo!</p>',
        headers: { 'Content-Type': /text\/html/ }
      },
      function(res) {
        res.headers.should.not.have.property('content-encoding');
      }
    );
  },
  'test compressable multiple Accept-Encoding types': function() {
    assert.response(gzipCss, {
        url: '/style.css',
        headers: { 'Accept-Encoding': 'deflate,gzip,sdch' }
      }, {
        status: 200,
        headers: {
          'Content-Type': /text\/css/,
          'Content-Encoding': 'gzip',
          'Vary': 'Accept-Encoding'
        }
      }
    );
  },
  'test compressable index.html': function(beforeExit) {
    var n = 0;
    connect.createServer(
      gzip.staticGzip(fixturesPath, { extensions: ['.html'] })
    ).listen(9898, function() {
      var options = {
        path: '/',
        port: 9898,
        headers: {'Accept-Encoding': 'gzip'}
      };
      http.get(options, function(res) {
        gunzip(res, function(err, body) {
          body.should.equal('<p>Wahoo!</p>');
          n++;
        });
      });
    });
    beforeExit(function() {
      n.should.equal(1);
    });
  }
}

function gunzip(res, callback) {
  var process = spawn('gunzip', ['-c']),
      out = '',
      err = '';
  res.setEncoding('binary');
  res.on('data', function(chunk) {
    process.stdin.write(chunk, 'binary');
  });
  res.on('end', function() {
    process.stdin.end();
  });
  process.stdout.on('data', function(data) {
    out += data;
  });
  process.stderr.on('data', function(data) {
    err += data;
  });
  process.on('exit', function(code) {
    callback(err, out);
  });
}

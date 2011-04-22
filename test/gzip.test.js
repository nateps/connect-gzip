var connect = require('connect'),
    gzip = require('../index'),
    assert = require('assert'),
    http = require('http'),
    spawn = require('child_process').spawn,
    app = testServer();

function testServer() {
  return connect.createServer(
    gzip.gzip(),
    function(req, res) {
      var headers, body;
      if (req.url === '/style.css') {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
        body = 'body { font-size: 12px; color: red; }';
      } else if (req.url === '/') {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        body = '<p>Wahoo!</p>';
      }
      res.setHeader('Content-Length', body.length);
      res.end(body);
    }
  );
}

module.exports = {
  'test no Accept-Encoding': function() {
    assert.response(app, {
        url: '/style.css'
      }, {
        status: 200,
        body: 'body { font-size: 12px; color: red; }',
        headers: { 'Content-Type': /text\/css/ }
      }, function(res) {
        res.headers.should.not.have.property('content-encoding');
      }
    );
  },
  'test does not accept gzip': function() {
    assert.response(app, {
        url: '/style.css',
        headers: { 'Accept-Encoding': 'deflate' }
      }, {
        status: 200,
        body: 'body { font-size: 12px; color: red; }',
        headers: { 'Content-Type': /text\/css/ }
      }, function(res) {
        res.headers.should.not.have.property('content-encoding');
      }
    );
  },
  'test compressable multiple Accept-Encoding types': function() {
    assert.response(app, {
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
    testServer().listen(9899, function() {
      var options = {
        path: '/',
        port: 9899,
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

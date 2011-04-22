
/*!
 * Ext JS Connect
 * Copyright(c) 2010 Sencha Inc.
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var spawn = require('child_process').spawn,
    sys = require('sys');

/**
 * Provides gzip compression via the `gzip` executable.
 *
 * @return {Function}
 * @api public
 */

module.exports = function gzip(matchType){
  matchType = matchType || /text|javascript|json/;
  
  return function gzip(req, res, next) {
    var writeHead = res.writeHead,
        defaults = {};
    
    ['write', 'end'].forEach(function(name) {
      defaults[name] = res[name];
      res[name] = function() {
        res[name] = defaults[name];
        // Make sure headers are setup if they haven't been called yet
        if (res.writeHead !== writeHead) {
          res.writeHead(res.statusCode);
        }
        res[name].apply(this, arguments);
      }
    });
    
    res.writeHead = function(code) {
      var args = Array.prototype.slice.call(arguments, 0),
          write = defaults.write,
          end = defaults.end,
          headers, key, type, accept, gzip;
      if (args.length > 1) {
        headers = args.pop();
        for (key in headers) {
          res.setHeader(key, headers[key])
        }
      }
      
      accept = req.headers['accept-encoding'] || '';
      type = res.getHeader('content-type') || '';
      encoding = res.getHeader('content-encoding');
      
      if (code !== 200 || !~accept.indexOf('gzip') ||
          !matchType.test(type) || encoding) {
        return finish();
      }
      
      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Vary', 'Accept-Encoding');
      res.removeHeader('Content-Length');
      
      gzip = spawn('gzip', ['--best', '-c']);
      
      res.write = function(chunk, encoding) {
        gzip.stdin.write(chunk, encoding);
      };

      res.end = function(chunk, encoding) {
        if (chunk) {
          res.write(chunk, encoding);
        }
        gzip.stdin.end();
      };

      gzip.stdout.addListener('data', function(chunk) {
        write.call(res, chunk);
      });

      gzip.addListener('exit', function(code) {
        res.write = write;
        res.end = end;
        res.end();
      });
      
      finish();
      
      function finish() {
        res.writeHead = writeHead;
        res.writeHead.apply(res, args);
      }
    };

    next();
  };
};

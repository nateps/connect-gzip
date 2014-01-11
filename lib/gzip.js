/*!
 * Ext JS Connect
 * Copyright(c) 2010 Sencha Inc.
 * MIT Licensed
 */

/**
 * Connect middleware providing gzip compression on the fly. By default, it
 * compresses requests with mime types that match the expression
 * /text|javascript|json/.
 *
 * Options:
 *
 *  - `matchType`   Regular expression matching mime types to be compressed
 *  - gzip options  chunkSize, windowBits, level, memLevel, strategy, flush
 *
 * @param {Object} options
 * @api public
 */

var zlib = require('zlib');

function hasOwnProperty(o, key) {
  return Object.prototype.hasOwnProperty.call(o, key);
}
function selectProperties(o, key1, key2) {
  var object = {};
  for (var i = 1, ii = arguments.length; i < ii; i++) {
    var key = arguments[i];
    if (hasOwnProperty(o, key)) {
      object[key] = o[key];
    }
  }
  return object;
}

exports = module.exports = function gzip(options) {
  var options = options || {},
      matchType = options.matchType || /text|javascript|json/,
      gzipOptions = selectProperties(options,
            'chunkSize', 'windowBits', 'level', 'memLevel', 'strategy', 'flush');

  if (!matchType.test) throw new Error('option matchType must be a regular expression');

  return function gzip(req, res, next) {
    var writeHead = res.writeHead,
        defaults = {};

    ['write', 'end'].forEach(function(name) {
      defaults[name] = res[name];
      res[name] = function() {
        // Make sure headers are setup if they haven't been called yet
        if (res.writeHead !== writeHead) {
          res.writeHead(res.statusCode);
        }
        res[name].apply(this, arguments);
      };
    });

    res.writeHead = function(code) {
      var args = Array.prototype.slice.call(arguments, 0),
          write = defaults.write,
          end = defaults.end,
          headers, key, accept, type, encoding, gzip, ua;
      if (args.length > 1) {
        headers = args.pop();
        for (key in headers) {
          res.setHeader(key, headers[key]);
        }
      }

      ua = req.headers['user-agent'] || '';
      accept = req.headers['accept-encoding'] || '';
      type = res.getHeader('content-type') || '';
      encoding = res.getHeader('content-encoding');

      if (req.method === 'HEAD' || code !== 200 || !~accept.indexOf('gzip') ||
          !matchType.test(type) || encoding ||
          (~ua.indexOf('MSIE 6') && !~ua.indexOf('SV1'))) {
        res.write = write;
        res.end = end;
        return finish();
      }

      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Vary', 'Accept-Encoding');
      var hasLength = res.get('Content-Length');
      res.removeHeader('Content-Length');

      var gzip = zlib.createGzip(gzipOptions);

      res.write = function(chunk, encoding) {
        gzip.write(chunk, encoding);
      };

      res.end = function(chunk, encoding) {
        if (chunk) {
          res.write(chunk, encoding);
        }
        gzip.end();
      };

      if(hasLength) {
        // if length is defined, send the compressed content as whole
        var chunks = [];
          gzip.addListener('data', function(chunk) {
              chunks.push(chunk);
          });

          gzip.addListener('end', function() {
              res.write = write;
              res.end = end;

              var l = 0;
              for(var i=0; i < chunks.length; i++) {
                  l += chunks[i].length;
              }
              res.setHeader('Content-Length', l);
              finish();

              for(var i=0; i < chunks.length; i++) {
                  res.write( chunks[i] );
              }
              res.end();
          });

          gzip.addListener('error', function(error) {
              finish();
              res.close();
          });

      } else {
          gzip.addListener('data', function(chunk) {
            write.call(res, chunk);
          });

          gzip.addListener('end', function() {
            res.write = write;
            res.end = end;
            res.end();
          });

          gzip.addListener('error', function(error) {
            res.close();
          });

          finish();
      }
        function finish() {
            res.writeHead = writeHead;
            res.writeHead.apply(res, args);
        }
    };

    next();
  };
};

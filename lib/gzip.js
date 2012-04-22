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
 *  - `flags`       DEPRECATED: String of flags passed to the binary. Nothing
 *                  by default
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

// Do some cheap parsing of flags to ease deprecation.
function optionsFromGzipFlags(flags) {
  var options = {};
  flags = (flags || '').split(' ');
  if (flags.indexOf('--best') > 0) {
    options.level = 9;
  }
  if (flags.indexOf('--fast') > 0) {
    options.level = 1;
  }
  for (var i = 0, ii = 9; i < ii; i++) {
    if (flags.indexOf('-' + i) > 0) {
      options.level = i;
    }
  }
  return i;
}

exports = module.exports = function gzip(options) {
  var options = options || {},
      matchType = options.matchType || /text|javascript|json/,
      gzipOptions = selectProperties(options,
          'chunkSize', 'windowBits', 'level', 'memLevel', 'strategy');

  if (!matchType.test) throw new Error('option matchType must be a regular expression');
  
  if (options.flags) {
    options = optionsFromGzipFlags(options.flags);
  }
  
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
      
      function finish() {
        res.writeHead = writeHead;
        res.writeHead.apply(res, args);
      }
    };

    next();
  };
};

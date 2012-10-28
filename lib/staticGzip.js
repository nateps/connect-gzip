/*!
 * Ext JS Connect
 * Copyright(c) 2010 Sencha Inc.
 * MIT Licensed
 */

var fs = require('fs'),
    parse = require('url').parse,
    path = require('path'),
    mime = require('mime'),
    zlib = require('zlib'),
    send = require('send');

/**
 * staticGzip gzips statics and then serves them with the regular Connect
 * static provider. By default, it compresses files with mime types that
 * match the expression /text|javascript|json/.
 *
 * Options:
 *
 *  - `matchType`   Regular expression matching mime types to be compressed
 *  - `flags`       DEPRECATED: String of flags passed to the binary. Nothing
 *                  by default
 *
 * @param {String} root
 * @param {Object} options
 * @api public
 */

exports = module.exports = function staticGzip(root, options) {
  var options = options || {},
      matchType = options.matchType || /text|javascript|json/,
      rootLength;

  if (!root) throw new Error('staticGzip root must be set');
  if (!matchType.test) throw new Error('option matchType must be a regular expression');

  options.root = root;
  rootLength = root.length;

  return function(req, res, next) {
    var url, filename, type, acceptEncoding, ua;

    if (req.method !== 'GET') return next();

    url = parse(req.url);
    filename = path.join(root, url.pathname);
    if ('/' == filename[filename.length - 1]) filename += 'index.html';

    type = mime.lookup(filename);
    if (!matchType.test(type)) {
      return passToStatic(filename);
    }

    acceptEncoding = req.headers['accept-encoding'] || '';
    if (!~acceptEncoding.indexOf('gzip')) {
      return passToStatic(filename);
    }

    ua = req.headers['user-agent'] || '';
    if (~ua.indexOf('MSIE 6') && !~ua.indexOf('SV1')) {
      return passToStatic(filename);
    }

    // Potentially malicious path
    if (~filename.indexOf('..')) {
      return passToStatic(filename);
    }

    // Check for requested file
    fs.stat(filename, function(err, stat) {
      if (err || stat.isDirectory()) {
        return next();
      }

      // Check for compressed file
      var base = path.basename(filename),
          dir = path.dirname(filename),
          gzipname = path.join(dir, base + '.' + Number(stat.mtime) + '.gz');
      fs.stat(gzipname, function(err) {
        if (err && err.code === 'ENOENT') {

			var gzip = zlib.createGzip()
			// Gzipped file doesn't exist, so make it and then send

			// First write compressed data to a temporary file. This
			// avoids race condition when several node instances are
			// competing for the same file and other node instance
			// would try to send half-done file.
			var tmpname = gzipname + '.' + process.pid + '.tmp';
			var outfile = fs.createWriteStream( tmpname );
			var infile = fs.createReadStream( filename );

			outfile.on('close', function() {
				// compressed data has been written to the temporary
				// file and file descriptor is closed.
				fs.rename( tmpname, gzipname, function() {
					// temporary file renamed to final file
					return sendGzip();
				});
			});

			// pipe compressed data to file
			infile.pipe(gzip).pipe(outfile);

        } else if (err) {
			return passToStatic(filename);
        } else {
			return sendGzip();
        }
      });

      function sendGzip() {
        var charset = mime.charsets.lookup(type),
            contentType = type + (charset ? '; charset=' + charset : '');
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Encoding', 'gzip');
        res.setHeader('Vary', 'Accept-Encoding');
        passToStatic(gzipname);
      }
    });

	// send file
    function passToStatic(name) {
	  send(req, name.substr(rootLength))
		.root(options.root)
		.maxage(options.maxAge)
		// in case of error just pass through
		.on('error', function() { next(); })
		.pipe(res);
    }
  };
};

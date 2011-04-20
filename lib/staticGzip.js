/*!
 * Ext JS Connect
 * Copyright(c) 2010 Sencha Inc.
 * MIT Licensed
 */

var fs = require('fs'),
    parse = require('url').parse,
    path = require('path'),
    exec = require('child_process').exec,
    staticSend = require('connect').static.send,
    bin = 'gzip', // Default command for gzip binary
    flags = '--best'; // Default flags passed to gzip

/**
 * staticGzip gzips statics via whitelist of extensions specified
 * by the `extensions` option. Once created, `staticProvider` can continue
 * on to serve the gzipped version of the file.
 *
 * Options:
 *
 *  - `root`        Root direction from which to generate gzipped statics
 *  - `extensions`  Array of extensions serving as a whitelist
 *  - `flags`       String of flags passed to the binary
 *  - `bin`         Binary executable defaulting to "gzip"
 *
 * @param {Object} options
 * @api public
 */

exports = module.exports = function staticGzip(root, options) {
  var options = options || {},
      extensions = options.extensions,
      whitelist = {};

  if (!root) throw new Error('staticGzip root must be set');
  if (!extensions) throw new Error('staticGzip extensions array must be passed');
  
  if (options.bin) bin = options.bin;
  if (options.flags) flags = options.flags;
  
  extensions.forEach(function(item) {
    whitelist[item] = true;
  });
  
  return function(req, res, next) {
    var acceptEncoding, url, filename, ext;
    
    if (req.method !== 'GET') return next();
    
    url = parse(req.url);
    filename = path.join(root, url.pathname);
    if ('/' == filename[filename.length - 1]) filename += 'index.html';
    
    ext = path.extname(filename);
    acceptEncoding = req.headers['accept-encoding'] || '';
    
    // When the extension is not whitelisted or Accept-Encoding does not allow
    // gzip, pass along to the regular static provider
    if (!whitelist[ext] || !~acceptEncoding.indexOf('gzip')) {
      return passToStatic(filename);
    }
    
    // Check for requested file
    fs.stat(filename, function(err, stat) {
      if (err || stat.isDirectory()) {
        return passToStatic(filename);
      }
      
      // Check for compressed file
      var gzipname = path.join(path.dirname(filename),
            Number(stat.mtime) + '.gz.' + path.basename(filename)
          );
      fs.stat(gzipname, function(err) {
        if (err && err.code === 'ENOENT') {
          // Gzipped file doesn't exist, so make it then send
          gzip(filename, gzipname, function(err) {
            return sendGzip();
          });
        } else if (err) {
          return passToStatic(filename);
        } else {
          return sendGzip();
        }
      });
      
      function sendGzip() {
        res.setHeader('Content-Encoding', 'gzip');
        res.setHeader('Vary', 'Accept-Encoding');
        passToStatic(gzipname);
      }
    });
    
    function passToStatic(name) {
      var o = Object.create(options);
      o.path = name;
      staticSend(req, res, next, o);
    }
  }
};

/**
 * Gzip `src` to `dest`.
 *
 * @param {String} src
 * @param {String} dest
 * @api private
 */

function gzip(src, dest, callback) {
  var cmd = bin + ' ' + flags + ' -c ' + src + ' > ' + dest;
  exec(cmd, function(err, stdout, stderr) {
    if (err) {
      console.error('\n' + err.stack);
      fs.unlink(dest);
    }
    callback(err);
  });
};
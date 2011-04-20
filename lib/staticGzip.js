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
    if (req.method !== 'GET') return next();
    
    var acceptEncoding = req.headers['accept-encoding'] || '',
        url = parse(req.url),
        filename = path.join(root, url.pathname);
    
    if ('/' == filename[filename.length - 1]) filename += 'index.html';
    var ext = path.extname(filename);
    
    // When Accept-Encoding does not allow gzip or the extension is not
    // whitelisted, pass along to the regular static provider
    if (!~acceptEncoding.indexOf('gzip') || !whitelist[ext]) {
      options.path = filename;
      return staticSend(req, res, next, options);
    }
    
    // Check for requested file
    fs.stat(filename, function(err, stat) {
      // Ignore ENOENT (file doesn't exist)
      if (err) {
        return err.code === 'ENOENT' ? next() : next(err);
      // Ignore directories
      } else if (stat.isDirectory()) {
        return next();
      }
      
      // Check for compressed file
      var gzipname = path.join(path.dirname(filename),
            Number(stat.mtime) + '.gz.' + path.basename(filename)
          );
      fs.stat(gzipname, function(err) {
        if (err && err.code === 'ENOENT') {
          // Gzipped file doesn't exist, so make it then send
          gzip(filename, gzipname, function(err) {
            send();
          });
        } else if (err) {
          next(err);
        } else {
          send();
        }
      });
      
      function send() {
        res.setHeader('Content-Encoding', 'gzip');
        res.setHeader('Vary', 'Accept-Encoding');
        options.path = gzipname;
        staticSend(req, res, next, options);
      }
    });
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
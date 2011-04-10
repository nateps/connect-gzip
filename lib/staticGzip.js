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
    mime = require('mime'),
    bin = 'gzip', // Default command for gzip binary
    flags = '--best'; // Default flags passed to gzip

/**
 * staticGzip gzips statics via whitelist of mime types specified
 * by the `compress` option. Once created `staticProvider` can continue
 * on to serve the gzipped version of the file.
 *
 * Options:
 *
 *  - `root`      Root direction from which to generate gzipped statics
 *  - `compress`  Array of mime types serving as a whitelist
 *  - `flags`     String of flags passed to the binary
 *  - `bin`       Binary executable defaulting to "gzip"
 *
 * @param {Object} options
 * @api public
 */

exports = module.exports = function staticGzip(root, options) {
    var options = options || {},
        compress = options.compress,
        whitelist = {};

    if (!root) throw new Error('staticGzip root must be set');
    if (!compress) throw new Error('staticGzip compress array must be passed');
    
    if (options.flags) flags = options.flags;
    if (options.bin) bin = options.bin;

    compress.forEach(function(item) {
      whitelist[item] = true;
    });
    
    return function(req, res, next) {
        if (req.method !== 'GET') return next();

        // Ignore when Accept-Encoding does not allow gzip
        var acceptEncoding = req.headers['accept-encoding'] || '';
        if (acceptEncoding && !~acceptEncoding.indexOf('gzip')) return next();

        var url = parse(req.url),
            filename = path.join(root, url.pathname),
            mimeType = mime.lookup(filename);
        if (!whitelist[mimeType]) return next();
        
        // Check for requested file
        fs.stat(filename, function(err, stat) {
            // Ignore ENOENT (file doesn't exist)
            if (err) {
              return err.code === 'ENOENT' ? next() : next(err);
            // Ignore directories
            } else if (stat.isDirectory()) {
              next();
            }
            
            // Check for compressed file
            var gzipname = filename + '.' + Number(stat.mtime) + '.gz';
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
                var writeHead = res.writeHead;
                res.writeHead = function(status, headers) {
                    headers = headers || {};
                    res.writeHead = writeHead;
                    headers['Content-Type'] = mimeType;
                    headers['Content-Encoding'] = 'gzip';
                    res.writeHead(status, headers);
                };

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
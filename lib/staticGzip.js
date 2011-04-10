
/*!
 * Ext JS Connect
 * Copyright(c) 2010 Sencha Inc.
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var fs = require('fs'),
    parse = require('url').parse,
    path = require('path'),
    exec = require('child_process').exec,
    send = require('connect').static.send, 
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

exports = module.exports = function staticGzip(root, options){
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
    
    return function(req, res, next){
        if (req.method !== 'GET') return next();

        var acceptEncoding = req.headers['accept-encoding'] || '';

        // Ignore when Accept-Encoding does not allow gzip
        if (acceptEncoding && !~acceptEncoding.indexOf('gzip')) return next();

        // Parse the url
        var url = parse(req.url),
            filename = path.join(root, url.pathname),
            mimeType = mime.lookup(filename);

        // MIME type not white-listed
        if (!whitelist[mimeType]) return next();

        // Check if gzipped static is available
        gzipped(filename, function(err, path, ext){
            if (err && err.code === 'ENOENT') {
                next();
                // We were looking for a gzipped static,
                // so lets gzip it!
                if (err.path.indexOf('.gz') === err.path.length - 3) {
                    gzip(filename, path);
                }
            } else if (err) {
                next(err);
            } else {
                var writeHead = res.writeHead;
                res.writeHead = function(status, headers){
                    headers = headers || {};
                    res.writeHead = writeHead;
                    headers['Content-Type'] = mimeType;
                    headers['Content-Encoding'] = 'gzip';
                    res.writeHead(status, headers);
                };
                
                options.path = path;
                send(req, res, next, options);
            }
        });
    }
};

/**
 * Check for a gzipped version of the file at `path`.
 *
 * @param {String} path
 * @param {Function} fn
 * @api private
 */

function gzipped(path, fn) {
    fs.stat(path, function(err, stat){
        if (err) return fn(err);
        var ext = '.' + Number(stat.mtime) + '.gz';
        path += ext;
        fs.stat(path, function(err){
            fn(err, path, ext);
        });
    });
};

/**
 * Gzip `src` to `dest`.
 *
 * @param {String} src
 * @param {String} dest
 * @api private
 */

function gzip(src, dest) {
    var cmd = bin + ' ' + flags + ' -c ' + src + ' > ' + dest;
    exec(cmd, function(err, stdout, stderr){
        if (err) {
            console.error('\n' + err.stack);
            fs.unlink(dest);
        }
    });
};
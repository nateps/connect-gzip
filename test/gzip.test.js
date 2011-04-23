var connect = require('connect'),
    fs = require('fs'),
    helpers = require('./helpers'),
    testUncompressed = helpers.testUncompressed,
    testCompressed = helpers.testCompressed,
    gzip = require('../index'),
    
    fixturesPath = __dirname + '/fixtures',
    cssBody = fs.readFileSync(fixturesPath + '/style.css', 'utf8'),
    htmlBody = fs.readFileSync(fixturesPath + '/index.html', 'utf8'),
    cssPath = '/style.css',
    htmlPath = '/',
    matchCss = /text\/css/,
    matchHtml = /text\/html/;

function server() {
  var args = Array.prototype.slice.call(arguments, 0),
      callback = args.pop();
  args.push(function(req, res) {
    var headers = {},
        body;
    if (req.url === cssPath) {
      headers['Content-Type'] = 'text/css; charset=utf-8';
      body = cssBody;
    } else if (req.url === htmlPath) {
      headers['Content-Type'] = 'text/html; charset=utf-8';
      body = htmlBody;
    }
    headers['Content-Length'] = body.length;
    callback(res, headers, body);
  });
  return connect.createServer.apply(null, args);
}

function setHeaders(res, headers) {
  for (var key in headers) {
    res.setHeader(key, headers[key]);
  }
}
var setHeadersWriteHeadWrite = server(gzip.gzip(), function(res, headers, body) {
  setHeaders(res, headers);
  res.writeHead(200);
  res.write(body);
  res.end();
});
var setHeadersWriteHeadEnd = server(gzip.gzip(), function(res, headers, body) {
  setHeaders(res, headers);
  res.writeHead(200);
  res.end(body);
});
var setHeadersWrite = server(gzip.gzip(), function(res, headers, body) {
  setHeaders(res, headers);
  res.write(body);
  res.end();
});
var setHeadersEnd = server(gzip.gzip(), function(res, headers, body) {
  setHeaders(res, headers);
  res.end(body);
});
var writeHeadWrite = server(gzip.gzip(), function(res, headers, body) {
  res.writeHead(200, headers);
  res.write(body);
  res.end();
});
var writeHeadEnd = server(gzip.gzip(), function(res, headers, body) {
  res.writeHead(200, headers);
  res.end(body);
});
var css = server(gzip.gzip({ matchType: /css/ }), function(res, headers, body) {
  res.writeHead(200, headers);
  res.end(body);
});
var best = server(gzip.gzip({ flags: '--best' }), function(res, headers, body) {
  res.writeHead(200, headers);
  res.end(body);
});

module.exports = {
  'gzip test uncompressable: no Accept-Encoding': testUncompressed(
    css, cssPath, {}, cssBody, matchCss
  ),
  'gzip test uncompressable: does not accept gzip': testUncompressed(
    css, cssPath, { 'Accept-Encoding': 'deflate' }, cssBody, matchCss
  ),
  'gzip test uncompressable: unmatched mime type': testUncompressed(
    css, htmlPath, { 'Accept-Encoding': 'gzip' }, htmlBody, matchHtml
  ),
  'gzip test compressable': testCompressed(
    css, cssPath, { 'Accept-Encoding': 'gzip' }, cssBody, matchCss
  ),
  'gzip test compressable: multiple Accept-Encoding types': testCompressed(
    css, cssPath, { 'Accept-Encoding': 'deflate, gzip, sdch' }, cssBody, matchCss
  ),
  
  'gzip test compressable: specify --best flag': testCompressed(
    best, htmlPath, { 'Accept-Encoding': 'gzip' }, htmlBody, matchHtml
  ),
  
  'gzip test uncompressable: setHeaders, writeHead, write, end': testUncompressed(
    setHeadersWriteHeadWrite, htmlPath, {}, htmlBody, matchHtml
  ),
  'gzip test compressable: setHeaders, writeHead, write, end': testCompressed(
    setHeadersWriteHeadWrite, htmlPath, { 'Accept-Encoding': 'gzip' }, htmlBody, matchHtml
  ),
  'gzip test uncompressable: setHeaders, writeHead, end': testUncompressed(
    setHeadersWriteHeadEnd, htmlPath, {}, htmlBody, matchHtml
  ),
  'gzip test compressable: setHeaders, writeHead, end': testCompressed(
    setHeadersWriteHeadEnd, htmlPath, { 'Accept-Encoding': 'gzip' }, htmlBody, matchHtml
  ),
  
  'gzip test uncompressable: setHeaders, write, end': testUncompressed(
    setHeadersWrite, htmlPath, {}, htmlBody, matchHtml
  ),
  'gzip test compressable: setHeaders, write, end': testCompressed(
    setHeadersWrite, htmlPath, { 'Accept-Encoding': 'gzip' }, htmlBody, matchHtml
  ),
  'gzip test uncompressable: setHeaders, end': testUncompressed(
    setHeadersEnd, htmlPath, {}, htmlBody, matchHtml
  ),
  'gzip test compressable: setHeaders, end': testCompressed(
    setHeadersEnd, htmlPath, { 'Accept-Encoding': 'gzip' }, htmlBody, matchHtml
  ),
  
  'gzip test uncompressable: writeHead, write, end': testUncompressed(
    writeHeadWrite, htmlPath, {}, htmlBody, matchHtml
  ),
  'gzip test compressable: writeHead, write, end': testCompressed(
    writeHeadWrite, htmlPath, { 'Accept-Encoding': 'gzip' }, htmlBody, matchHtml
  ),
  'gzip test uncompressable: writeHead, end': testUncompressed(
    writeHeadEnd, htmlPath, {}, htmlBody, matchHtml
  ),
  'gzip test compressable: writeHead, end': testCompressed(
    writeHeadEnd, htmlPath, { 'Accept-Encoding': 'gzip' }, htmlBody, matchHtml
  ),
}
var connect = require('connect'),
    fs = require('fs'),
    helpers = require('./helpers'),
    testUncompressed = helpers.testUncompressed,
    testCompressed = helpers.testCompressed,
    gzip = require('../index'),
    
    fixturesPath = __dirname + '/fixtures',
    cssBody = fs.readFileSync(fixturesPath + '/style.css', 'utf8'),
    htmlBody = fs.readFileSync(fixturesPath + '/index.html', 'utf8'),
    appBody = '<b>Non-static html</b>',
    cssPath = '/style.css',
    htmlPath = '/',
    matchCss = /text\/css/,
    matchHtml = /text\/html/,
    
    staticDefault = connect.createServer(
      gzip.staticGzip(fixturesPath)
    ),
    staticCss = connect.createServer(
      gzip.staticGzip(fixturesPath, { matchType: /css/ }),
      function(req, res) {
        if (req.url === '/app') {
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.setHeader('Content-Length', appBody.length);
          res.end(appBody);
        }
      }
    );

module.exports = {
  'staticGzip test uncompressable: no Accept-Encoding': testUncompressed(
    staticCss, cssPath, {}, cssBody, matchCss
  ),
  'staticGzip test uncompressable: does not accept gzip': testUncompressed(
    staticCss, cssPath, { 'Accept-Encoding': 'deflate' }, cssBody, matchCss
  ),
  'staticGzip test uncompressable: unmatched mime type': testUncompressed(
    staticCss, htmlPath, { 'Accept-Encoding': 'gzip' }, htmlBody, matchHtml
  ),
  'staticGzip test uncompressable: non-static request': testUncompressed(
    staticCss, '/app', { 'Accept-Encoding': 'gzip' }, appBody, matchHtml
  ),
  'staticGzip test compressable': testCompressed(
    staticCss, cssPath, { 'Accept-Encoding': 'gzip' }, cssBody, matchCss
  ),
  'staticGzip test compressable: multiple Accept-Encoding types': testCompressed(
    staticCss, cssPath, { 'Accept-Encoding': 'deflate, gzip, sdch' }, cssBody, matchCss
  ),
  
  'staticGzip test uncompressable: default content types': testUncompressed(
    staticDefault, htmlPath, {}, htmlBody, matchHtml
  ),
  'staticGzip test compressable: default content types': testCompressed(
    staticDefault, htmlPath, { 'Accept-Encoding': 'gzip' }, htmlBody, matchHtml
  ),
}

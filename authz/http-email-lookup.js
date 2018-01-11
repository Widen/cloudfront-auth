const https = require('https');
const http = require('http');
const url = require('url');
const config = require('./config');

function isAuthorized(decoded, request, callback, unauthorized, internalServerError) {
  var lookup = url.parse(config.EMAIL_LOOKUP_URL);
  const options = {
    hostname: lookup.hostname,
    port: 443,
    path: lookup.pathname,
    agent: false
  };
  https.get(options, (res) => {
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
      const parsedData = JSON.parse(rawData);
      if (Array.isArray(parsedData) && parsedData.indexOf(decoded.sub) > -1) {
        callback(null, request);
      } else {
        unauthorized('Unauthorized. User ' + decoded.sub + ' is not permitted.', callback);
      }
    })
  }).on('error', (e) => {
    return false;
  })
}

exports.isAuthorized = isAuthorized;

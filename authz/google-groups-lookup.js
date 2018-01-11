const fs = require('fs');
const https = require('https');
const jwt = require('jsonwebtoken');
const url = require('url');
const qs = require('querystring');
const config = require('./config');

function isAuthorized(decoded, request, callback, unauthorized, internalServerError) {
  var googleAuthz = JSON.parse(fs.readFileSync('./google-authz.json'));
  var groupChecks = 0;
  var token = jwt.sign({
    scope: 'https://www.googleapis.com/auth/admin.directory.group.member.readonly'
  },
  googleAuthz.private_key, {
    issuer: googleAuthz.client_email,
    expiresIn: 3600,
    audience: googleAuthz.token_uri,
    subject: config.USER_EMAIL,
    algorithm: 'RS256'
  })

  var tokenUrl = url.parse(googleAuthz.token_uri);
  const postData = qs.stringify({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: token
  });
  const options = {
    hostname: tokenUrl.hostname,
    port: 443,
    path: tokenUrl.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData)
    }
  };
  const req = https.request(options, (res) => {
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
      const parsedData = JSON.parse(rawData);
      for (var i = 0; i < googleAuthz.cloudfront_authz_groups.length; i++) {
        const options = {
          path: '/admin/directory/v1/groups/' + googleAuthz.cloudfront_authz_groups[i] + '/hasMember/' + decoded.sub,
          hostname: 'www.googleapis.com',
          port: 443,
          headers: {
            'Authorization': parsedData.token_type + ' ' + parsedData.access_token
          },
          agent: false
        };
        https.get(options, (res) => {
          let rawData = '';
          res.on('data', (chunk) => { rawData += chunk; });
          res.on('end', () => {
            const parsedData = JSON.parse(rawData);
            groupChecks++;
            if (!parsedData.error && parsedData.isMember == true && decoded.aud === request.headers.host[0].value && decoded.sub.endsWith(config.HOSTED_DOMAIN)) {
              callback(null, request);
            } else if (groupChecks >= googleAuthz.cloudfront_authz_groups.length) {
              unauthorized('Unauthorized. User ' + decoded.sub + ' is not permitted.', callback);
            }
          });
        }).on('error', (e) => {
          internalServerError(e.message, callback);
        });
      }
    });
  });
  req.on('error', (e) => {
    internalServerError(e.message, callback);
  });
  // Write data to request body
  req.write(postData);
  req.end();
}

exports.isAuthorized = isAuthorized;

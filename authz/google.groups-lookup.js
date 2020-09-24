const fs = require('fs');
const axios = require('axios');
const jwt = require('jsonwebtoken');
const qs = require('querystring');

function isAuthorized(decoded, request, callback, unauthorized, internalServerError, config) {
  var googleAuthz = JSON.parse(fs.readFileSync('./google-authz.json'));
  var groupChecks = 0;
  var token = jwt.sign({
    scope: 'https://www.googleapis.com/auth/admin.directory.group.member.readonly'
  },
  googleAuthz.private_key, {
    issuer: googleAuthz.client_email,
    expiresIn: 3600,
    audience: googleAuthz.token_uri,
    subject: config.SERVICE_ACCOUNT_EMAIL,
    algorithm: 'RS256'
  });
  const postData = qs.stringify({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: token
  });
  axios.post(googleAuthz.token_uri, postData)
    .then(function(response) {
      for (var i = 0; i < googleAuthz.cloudfront_authz_groups.length; i++) {
        var authorization = response.data.token_type + ' ' + response.data.access_token;
        var membershipGet = 'https://www.googleapis.com/admin/directory/v1/groups/' + googleAuthz.cloudfront_authz_groups[i] + '/members/' + decoded.sub;
        console.log(membershipGet + ': ' + authorization);
        axios.get(membershipGet, { headers: {'Authorization': authorization}})
          .then(function(response) {
            groupChecks++;
            if (!response.data.error && response.data.status === 'ACTIVE' && decoded.aud === request.headers.host[0].value) {
              callback(null, request);
            } else if (groupChecks >= googleAuthz.cloudfront_authz_groups.length) {
              unauthorized('Unauthorized', 'User ' + decoded.sub + ' is not permitted.', '', callback);
            }
          })
          .catch(function(error) {
            groupChecks++;
            if (groupChecks >= googleAuthz.cloudfront_authz_groups.length) {
              unauthorized('Unauthorized.', 'User ' + decoded.sub + ' is not permitted.', '', callback);
            }
          });
      }
    })
    .catch(function(error) {
      internalServerError(callback);
    });
}

function getSubject(decoded) { return decoded.payload.email; }

exports.isAuthorized = isAuthorized;
exports.getSubject = getSubject;

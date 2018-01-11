'use strict';
const qs = require('querystring');
const https = require('https');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const url = require('url');
const jwkToPem = require('jwk-to-pem');
const config = require('./config');
const auth = require('./auth');
var discoveryDocument;
var jwks;

exports.handler = (event, context, callback) => {
  // Avoid unnecessary discovery document calls with container reuse
  if (typeof jwks == 'undefined' || typeof discoveryDocument == 'undefined') {
    getDiscoveryDocumentData(event, context, callback);
  } else {
    processRequest(event, context, callback);
  }
};

// Main function
function processRequest(event, context, callback) {
  // Get request, request headers, and querystring dictionary
  const request = event.Records[0].cf.request;
  const headers = request.headers;
  const queryDict = qs.parse(request.querystring);

  if (request.uri.startsWith(config.CALLBACK_PATH)) {
    // Verify code exists
    if (!queryDict.code) {
      unauthorized("No code found.", callback);
    }

    // ID token request data
    const postData = qs.stringify({
      'code': queryDict.code,
      'client_id': config.CLIENT_ID,
      'client_secret': config.CLIENT_SECRET,
      'redirect_uri': "https://" + headers.host[0].value + config.CALLBACK_PATH,
      'grant_type': 'authorization_code'
    });

    // ID token request options
    const options = {
      hostname: 'www.googleapis.com',
      port: 443,
      path: '/oauth2/v4/token',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    // Send ID token request in exchange for code
    const req = https.request(options, (res) => {
      let rawData = '';
      res.on('data', (chunk) => { rawData += chunk; });
      res.on('end', () => {
        const parsedData = JSON.parse(rawData);
        const decodedData = jwt.decode(parsedData.id_token, {complete: true});
        try {
          // Search for correct JWK from discovery document and create PEM
          var pem = "";
          for (var i = 0; i < jwks.keys.length; i++) {
            if (decodedData.header.kid === jwks.keys[i].kid) {
              pem = jwkToPem(jwks.keys[i]);
            }
          }
          // Verify the JWT, the payload email, and that the email ends with configured hosted domain
          jwt.verify(parsedData.id_token, pem, { algorithms: ['RS256'] }, function(err, decoded) {
            if (err) {
              switch (err.name) {
                case 'TokenExpiredError':
                  redirectToGoogleLogin(request, callback)
                  break;
                case 'JsonWebTokenError':
                  unauthorized('JsonWebTokenError: ' + err.message, callback);
                  break;
                default:
                  unauthorized('Unauthorized. User ' + decoded.email + ' is not permitted.', callback);
              }
            } else if (!decoded.email.endsWith(config.HOSTED_DOMAIN)) {
              unauthorized('Unauthorized. User ' + decoded.email + ' is not permitted.', callback);
            } else if (decoded.email_verified === true) {
              // Once verified, create new JWT for this server
              var issuedAt = new Date().getTime();
              var expirationTime = issuedAt + config.TOKEN_AGE;
              const response = {
                status: '302',
                statusDescription: 'Found',
                body: 'ID token retrieved.',
                headers: {
                  location : [{
                    key: 'Location',
                    value: queryDict.state
                  }],
                  'set-cookie' : [{
                    key: 'Set-Cookie',
                    value : cookie.serialize('TOKEN', jwt.sign(
                      { },
                      config.PRIVATE_KEY.trim(),
                      {
                        audience: headers.host[0].value,
                        subject: decoded.email,
                        expiresIn: config.TOKEN_AGE,
                        algorithm: 'RS256'
                      } // Options
                    ))
                  }],
                },
              };
              callback(null, response);
            } else {
              unauthorized('Unauthorized. User ' + token.payload.email + ' is not permitted.', callback);
            }
          });
        } catch (e) {
          internalServerError(e.message, callback);
        }
      });
    });

    req.on('error', (e) => {
      internalServerError(e.message, callback);
    });

    // Write data to request body
    req.write(postData);
    req.end();
  } else if ("cookie" in headers
              && "TOKEN" in cookie.parse(headers["cookie"][0].value)) {
    // Verify the JWT, the payload email, and that the email ends with configured hosted domain
    jwt.verify(cookie.parse(headers["cookie"][0].value).TOKEN, config.PUBLIC_KEY.trim(), { algorithms: ['RS256'] }, function(err, decoded) {
      if (err) {
        switch (err.name) {
          case 'TokenExpiredError':
            redirectToGoogleLogin(request, callback)
            break;
          case 'JsonWebTokenError':
            unauthorized(err.message, callback);
            break;
          default:
            unauthorized('Unauthorized. User ' + decoded.sub + ' is not permitted.', callback);
        }
      } else {
        auth.isAuthorized(decoded, request, callback, unauthorized, internalServerError);
      }
    });
  } else {
    redirectToGoogleLogin(request, callback);
  }
}

function redirectToGoogleLogin(request, callback) {
  // Form Google's OAuth 2.0 Server URL
  var querystring = qs.stringify({
    "client_id": config.CLIENT_ID,
    "redirect_uri": "https://" + request.headers.host[0].value + config.CALLBACK_PATH,
    "scope": 'openid email',
    "hd": config.HOSTED_DOMAIN,
    "state": request.uri,
    "response_type": "code"
  });

  const response = {
    status: '302',
    statusDescription: 'Found',
    body: 'Authenticating with Google',
    headers: {
        location : [{
            key: 'Location',
            value: discoveryDocument.authorization_endpoint + "?" + querystring
         }],
         'set-cookie' : [{
           key: 'Set-Cookie',
           value : cookie.serialize('TOKEN', '', { path: '/', expires: new Date(1970, 1, 1, 0, 0, 0, 0) })
         }],
    },
  };
  callback(null, response);
}

function getDiscoveryDocumentData(event, context, callback) {
  // Get Discovery Document data
  const postData = "";
  const options = {
    hostname: 'accounts.google.com',
    port: 443,
    path: '/.well-known/openid-configuration',
    method: 'GET',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = https.request(options, (res) => {
    let rawData = '';
    res.on('data', (chunk) => { rawData += chunk; });
    res.on('end', () => {
      // Get jwks from discovery document url
      const parsedData = JSON.parse(rawData);
      try {
        discoveryDocument = parsedData;
        if (parsedData.hasOwnProperty('jwks_uri')) {
          // Get public key and verify JWT
          const postData = "";
          const keysUrl = url.parse(parsedData.jwks_uri);
          const options = {
            hostname: keysUrl.host,
            port: 443,
            path: keysUrl.path,
            method: 'GET',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Content-Length': Buffer.byteLength(postData)
            }
          };

          const req = https.request(options, (res) => {
            let rawData = '';
            res.on('data', (chunk) => { rawData += chunk; });
            res.on('end', () => {
              jwks = JSON.parse(rawData);
              // Callback to main function
              processRequest(event, context, callback);
            });
          });

          req.on('error', (e) => {
            internalServerError("Unable to verify JWT: " + e.message, callback);
          });

          // Write data to request body
          req.write(postData);
          req.end();
        } else {
          internalServerError("Unable to find JWK in discovery document.", callback);
        }
      } catch (e) {
        internalServerError("Unable to verify JWT: " + e.message, callback);
      }
    });
  });

  req.on('error', (e) => {
    internalServerError("Unable to verify JWT: " + e.message, callback);
  });

  // Write data to request body
  req.write(postData);
  req.end();
}

function unauthorized(body, callback) {
  const response = {
    status: '401',
    statusDescription: 'Unauthorized',
    body: body,
  };
  callback(null, response);
}

function internalServerError(body, callback) {
  const response = {
    status: '500',
    statusDescription: 'Internal Server Error',
    body: body,
  };
  callback(null, response);
}

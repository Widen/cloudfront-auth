const qs = require('querystring');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const jwkToPem = require('jwk-to-pem');
const auth = require('./auth.js');
const axios = require('axios');
var discoveryDocument;
var jwks;
var config;

exports.handler = (event, context, callback) => {
  if (typeof jwks == 'undefined' || typeof discoveryDocument == 'undefined' || typeof config == 'undefined') {
    config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
    // Get Discovery Document data
    axios.get(config.DISCOVERY_DOCUMENT)
      .then(function(response) {
        // Get jwks from discovery document url
        discoveryDocument = response.data;
        if (discoveryDocument.hasOwnProperty('jwks_uri')) {
          // Get public key and verify JWT
          axios.get(discoveryDocument.jwks_uri)
            .then(function(response) {
              jwks = response.data;
              // Callback to main function
              mainProcess(event, context, callback);
            })
            .catch(function(error) {
              internalServerError(error.message, callback);
            });
        } else {
          internalServerError("Unable to find JWK in discovery document.", callback);
        }
      })
      .catch(function(error) {
        internalServerError(error.message, callback);
      });
  } else {
    mainProcess(event, context, callback);
  }
};

function mainProcess(event, context, callback) {
  // Get request, request headers, and querystring dictionary
  const request = event.Records[0].cf.request;
  const headers = request.headers;
  const queryDict = qs.parse(request.querystring);
  if (request.uri.startsWith(config.CALLBACK_PATH)) {
    /** Verify code is in querystring */
    if (!queryDict.code) {
      unauthorized("No code found.", callback);
    }
    config.TOKEN_REQUEST.code = queryDict.code;
    /** Exchange code for authorization token */
    const postData = qs.stringify(config.TOKEN_REQUEST);
    axios.post(discoveryDocument.token_endpoint, postData)
      .then(function(response) {
        const decodedData = jwt.decode(response.data.id_token, {complete: true});
        try {
          // Search for correct JWK from discovery document and create PEM
          var pem = "";
          for (var i = 0; i < jwks.keys.length; i++) {
            if (decodedData.header.kid === jwks.keys[i].kid) {
              pem = jwkToPem(jwks.keys[i]);
            }
          }
          // Verify the JWT, the payload email, and that the email ends with configured hosted domain
          jwt.verify(response.data.id_token, pem, { algorithms: ['RS256'] }, function(err, decoded) {
            if (err) {
              switch (err.name) {
                case 'TokenExpiredError':
                  redirect(request, headers, callback)
                  break;
                case 'JsonWebTokenError':
                  unauthorized('JsonWebTokenError: ' + err.message, callback);
                  break;
                default:
                  unauthorized('Unauthorized. User ' + decodedData.payload.email + ' is not permitted.', callback);
              }
            } else {
              // Once verified, create new JWT for this server
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
                        subject: auth.getSubject(decodedData),
                        expiresIn: config.SESSION_DURATION,
                        algorithm: 'RS256'
                      } // Options
                    ))
                  }],
                },
              };
              callback(null, response);
            }
          });
        } catch (error) {
          internalServerError(error.message, callback);
        }
      })
      .catch(function(error) {
        internalServerError(error.message, callback);
      });
  } else if ("cookie" in headers
              && "TOKEN" in cookie.parse(headers["cookie"][0].value)) {
    // Verify the JWT, the payload email, and that the email ends with configured hosted domain
    jwt.verify(cookie.parse(headers["cookie"][0].value).TOKEN, config.PUBLIC_KEY.trim(), { algorithms: ['RS256'] }, function(err, decoded) {
      if (err) {
        switch (err.name) {
          case 'TokenExpiredError':
            redirect(request, headers, callback)
            break;
          case 'JsonWebTokenError':
            unauthorized(err.message, callback);
            break;
          default:
            unauthorized('Unauthorized. User ' + decoded.sub + ' is not permitted.', callback);
        }
      } else {
        auth.isAuthorized(decoded, request, callback, unauthorized, internalServerError, config);
      }
    });
  } else {
    redirect(request, headers, callback);
  }
}

function redirect(request, headers, callback) {
  var n = require('nonce')();
  config.AUTH_REQUEST.nonce = n();  
  config.AUTH_REQUEST.state = request.uri;
  // Redirect to Authorization Server
  var querystring = qs.stringify(config.AUTH_REQUEST);

  const response = {
    status: '302',
    statusDescription: 'Found',
    body: 'Redirecting to OIDC provider',
    headers: {
        location : [{
            key: 'Location',
            value: discoveryDocument.authorization_endpoint + '?' + querystring
         }],
         'set-cookie' : [{
           key: 'Set-Cookie',
           value : cookie.serialize('TOKEN', '', { path: '/', expires: new Date(1970, 1, 1, 0, 0, 0, 0) })
         }],
    },
  };
  callback(null, response);
}

function unauthorized(body, callback) {
  const response = {
    status: '401',
    statusDescription: 'Unauthorized',
    body: body,
    headers: {
       'set-cookie' : [{
         key: 'Set-Cookie',
         value : cookie.serialize('TOKEN', '', { path: '/', expires: new Date(1970, 1, 1, 0, 0, 0, 0) })
       }],
    },
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

const qs = require('querystring');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const jwkToPem = require('jwk-to-pem');
const auth = require('./auth.js');
const nonce = require('./nonce.js');
const axios = require('axios');
var discoveryDocument;
var jwks;
var config;

exports.handler = (event, context, callback) => {
  if (typeof jwks == 'undefined' || typeof discoveryDocument == 'undefined' || typeof config == 'undefined') {
    config = JSON.parse(fs.readFileSync('config.json', 'utf8'));

    // Get Discovery Document data
    console.log("Get discovery document data");
    axios.get(config.DISCOVERY_DOCUMENT)
      .then(function(response) {
        console.log(response);

        // Get jwks from discovery document url
        console.log("Get jwks from discovery document");
        discoveryDocument = response.data;
        if (discoveryDocument.hasOwnProperty('jwks_uri')) {

          // Get public key and verify JWT
          axios.get(discoveryDocument.jwks_uri)
            .then(function(response) {
              console.log(response);
              jwks = response.data;

              // Callback to main function
              mainProcess(event, context, callback);
            })
            .catch(function(error) {
              console.log("Internal server error: " + error.message);
              internalServerError(callback);
            });
        } else {
          console.log("Internal server error: Unable to find JWK in discovery document");
          internalServerError(callback);
        }
      })
      .catch(function(error) {
        console.log("Internal server error: " + error.message);
        internalServerError(callback);
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
  if (event.Records[0].cf.config.hasOwnProperty('test')) {
    config.AUTH_REQUEST.redirect_uri = event.Records[0].cf.config.test + config.CALLBACK_PATH;
    config.TOKEN_REQUEST.redirect_uri = event.Records[0].cf.config.test + config.CALLBACK_PATH;
  }
  if (request.uri.startsWith(config.CALLBACK_PATH)) {
    console.log("Callback from OIDC provider received");

    // Check for error response (https://tools.ietf.org/html/rfc6749#section-4.2.2.1)
    if (queryDict.error) {
      const errors = {
        "invalid_request": "Invalid Request",
        "unauthorized_client": "Unauthorized Client",
        "access_denied": "Access Denied",
        "unsupported_response_type": "Unsupported Response Type",
        "invalid_scope": "Invalid Scope",
        "server_error": "Server Error",
        "temporarily_unavailable": "Temporarily Unavailable"
      }

      var error = '';
      var error_description = '';
      var error_uri = '';

      if (errors[queryDict.error] != null) {
        // Replace with corresponding value
        error = errors[queryDict.error];
      } else {
        // Replace with passed in value
        error = queryDict.error;
      }

      if (queryDict.error_description != null) {
        error_description = queryDict.error_description;
      } else {
        error_description = '';
      }

      if (queryDict.error_uri != null) {
        error_uri = queryDict.error_uri;
      } else {
        error_uri = '';
      }

      unauthorized(error, error_description, error_uri, callback);
    }

    // Verify code is in querystring
    if (!queryDict.code) {
      unauthorized('No Code Found', '', '', callback);
    }
    config.TOKEN_REQUEST.code = queryDict.code;

    // Exchange code for authorization token
    const postData = qs.stringify(config.TOKEN_REQUEST);
    console.log("Requesting access token.");
    axios.post(discoveryDocument.token_endpoint, postData)
      .then(function(response) {
        console.log(response);
        const decodedData = jwt.decode(response.data.id_token, {complete: true});
        console.log(decodedData);
        try {
          console.log("Searching for JWK from discovery document");

          // Search for correct JWK from discovery document and create PEM
          var pem = "";
          for (var i = 0; i < jwks.keys.length; i++) {
            if (decodedData.header.kid === jwks.keys[i].kid) {
              pem = jwkToPem(jwks.keys[i]);
            }
          }
          console.log("Verifying JWT");

          // Verify the JWT, the payload email, and that the email ends with configured hosted domain
          jwt.verify(response.data.id_token, pem, { algorithms: ['RS256'] }, function(err, decoded) {
            if (err) {
              switch (err.name) {
                case 'TokenExpiredError':
                  console.log("Token expired, redirecting to OIDC provider.");
                  redirect(request, headers, callback)
                  break;
                case 'JsonWebTokenError':
                  console.log("JWT error, unauthorized.");
                  unauthorized('Json Web Token Error', err.message, '', callback);
                  break;
                default:
                  console.log("Unknown JWT error, unauthorized.");
                  unauthorized('Unknown JWT', 'User ' + decodedData.payload.email + ' is not permitted.', '', callback);
              }
            } else {

              // Validate nonce
              if ("cookie" in headers
                  && "NONCE" in cookie.parse(headers["cookie"][0].value)
                  && nonce.validateNonce(decoded.nonce, cookie.parse(headers["cookie"][0].value).NONCE)) {
                console.log("Setting cookie and redirecting.");

                // Once verified, create new JWT for this server
                const response = {
                  "status": "302",
                  "statusDescription": "Found",
                  "body": "ID token retrieved.",
                  "headers": {
                    "location" : [
                      {
                        "key": "Location",
                        "value": event.Records[0].cf.config.hasOwnProperty('test') ? (config.AUTH_REQUEST.redirect_uri + queryDict.state) : queryDict.state
                      }
                    ],
                    "set-cookie" : [
                      {
                        "key": "Set-Cookie",
                        "value" : cookie.serialize('TOKEN', jwt.sign(
                          { },
                          config.PRIVATE_KEY.trim(),
                          {
                            "audience": headers.host[0].value,
                            "subject": auth.getSubject(decodedData),
                            "expiresIn": config.SESSION_DURATION,
                            "algorithm": "RS256"
                          } // Options
                        ), {
                          path: '/',
                          maxAge: config.SESSION_DURATION
                        })
                      },
                      {
                        "key": "Set-Cookie",
                        "value" : cookie.serialize('NONCE', '', {
                          path: '/',
                          expires: new Date(1970, 1, 1, 0, 0, 0, 0)
                        })
                      }
                    ],
                  },
                };
                callback(null, response);
              } else {
                unauthorized('Nonce Verification Failed', '', '', callback);
              }
            }
          });
        } catch (error) {
          console.log("Internal server error: " + error.message);
          internalServerError(callback);
        }
      })
      .catch(function(error) {
        console.log("Internal server error: " + error.message);
        internalServerError(callback);
      });
  } else if ("cookie" in headers
              && "TOKEN" in cookie.parse(headers["cookie"][0].value)) {
    console.log("Request received with TOKEN cookie. Validating.");

    // Verify the JWT, the payload email, and that the email ends with configured hosted domain
    jwt.verify(cookie.parse(headers["cookie"][0].value).TOKEN, config.PUBLIC_KEY.trim(), { algorithms: ['RS256'] }, function(err, decoded) {
      if (err) {
        switch (err.name) {
          case 'TokenExpiredError':
            console.log("Token expired, redirecting to OIDC provider.");
            redirect(request, headers, callback)
            break;
          case 'JsonWebTokenError':
            console.log("JWT error, unauthorized.");
            unauthorized('Json Web Token Error', err.message, '', callback);
            break;
          default:
            console.log("Unknown JWT error, unauthorized.");
            unauthorized('Unauthorized.', 'User ' + decoded.sub + ' is not permitted.', '', callback);
        }
      } else {
        console.log("Authorizing user.");
        auth.isAuthorized(decoded, request, callback, unauthorized, internalServerError, config);
      }
    });
  } else {
    console.log("Redirecting to OIDC provider.");
    redirect(request, headers, callback);
  }
}

function redirect(request, headers, callback) {
  const n = nonce.getNonce();
  config.AUTH_REQUEST.nonce = n[0];
  config.AUTH_REQUEST.state = request.uri;

  // Redirect to Authorization Server
  var querystring = qs.stringify(config.AUTH_REQUEST);

  const response = {
    "status": "302",
    "statusDescription": "Found",
    "body": "Redirecting to OIDC provider",
    "headers": {
      "location" : [{
        "key": "Location",
        "value": discoveryDocument.authorization_endpoint + '?' + querystring
      }],
      "set-cookie" : [
        {
          "key": "Set-Cookie",
          "value" : cookie.serialize('TOKEN', '', {
            path: '/',
            expires: new Date(1970, 1, 1, 0, 0, 0, 0)
          })
        },
        {
          "key": "Set-Cookie",
          "value" : cookie.serialize('NONCE', n[1], {
            path: '/',
            httpOnly: true
          })
        }
      ],
    },
  };
  callback(null, response);
}

function unauthorized(error, error_description, error_uri, callback) {
  let page = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <!-- Simple HttpErrorPages | MIT License | https://github.com/AndiDittrich/HttpErrorPages -->
      <meta charset="utf-8" /><meta http-equiv="X-UA-Compatible" content="IE=edge" /><meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>We've got some trouble | 401 - Unauthorized</title>
      <style type="text/css">/*! normalize.css v5.0.0 | MIT License | github.com/necolas/normalize.css */html{font-family:sans-serif;line-height:1.15;-ms-text-size-adjust:100%;-webkit-text-size-adjust:100%}body{margin:0}article,aside,footer,header,nav,section{display:block}h1{font-size:2em;margin:.67em 0}figcaption,figure,main{display:block}figure{margin:1em 40px}hr{box-sizing:content-box;height:0;overflow:visible}pre{font-family:monospace,monospace;font-size:1em}a{background-color:transparent;-webkit-text-decoration-skip:objects}a:active,a:hover{outline-width:0}abbr[title]{border-bottom:none;text-decoration:underline;text-decoration:underline dotted}b,strong{font-weight:inherit}b,strong{font-weight:bolder}code,kbd,samp{font-family:monospace,monospace;font-size:1em}dfn{font-style:italic}mark{background-color:#ff0;color:#000}small{font-size:80%}sub,sup{font-size:75%;line-height:0;position:relative;vertical-align:baseline}sub{bottom:-.25em}sup{top:-.5em}audio,video{display:inline-block}audio:not([controls]){display:none;height:0}img{border-style:none}svg:not(:root){overflow:hidden}button,input,optgroup,select,textarea{font-family:sans-serif;font-size:100%;line-height:1.15;margin:0}button,input{overflow:visible}button,select{text-transform:none}[type=reset],[type=submit],button,html [type=button]{-webkit-appearance:button}[type=button]::-moz-focus-inner,[type=reset]::-moz-focus-inner,[type=submit]::-moz-focus-inner,button::-moz-focus-inner{border-style:none;padding:0}[type=button]:-moz-focusring,[type=reset]:-moz-focusring,[type=submit]:-moz-focusring,button:-moz-focusring{outline:1px dotted ButtonText}fieldset{border:1px solid silver;margin:0 2px;padding:.35em .625em .75em}legend{box-sizing:border-box;color:inherit;display:table;max-width:100%;padding:0;white-space:normal}progress{display:inline-block;vertical-align:baseline}textarea{overflow:auto}[type=checkbox],[type=radio]{box-sizing:border-box;padding:0}[type=number]::-webkit-inner-spin-button,[type=number]::-webkit-outer-spin-button{height:auto}[type=search]{-webkit-appearance:textfield;outline-offset:-2px}[type=search]::-webkit-search-cancel-button,[type=search]::-webkit-search-decoration{-webkit-appearance:none}::-webkit-file-upload-button{-webkit-appearance:button;font:inherit}details,menu{display:block}summary{display:list-item}canvas{display:inline-block}template{display:none}[hidden]{display:none}/*! Simple HttpErrorPages | MIT X11 License | https://github.com/AndiDittrich/HttpErrorPages */body,html{width:100%;height:100%;background-color:#21232a}body{color:#fff;text-align:center;text-shadow:0 2px 4px rgba(0,0,0,.5);padding:0;min-height:100%;-webkit-box-shadow:inset 0 0 100px rgba(0,0,0,.8);box-shadow:inset 0 0 100px rgba(0,0,0,.8);display:table;font-family:"Open Sans",Arial,sans-serif}h1{font-family:inherit;font-weight:500;line-height:1.1;color:inherit;font-size:36px}h1 small{font-size:68%;font-weight:400;line-height:1;color:#777}a{text-decoration:none;color:#fff;font-size:inherit;border-bottom:dotted 1px #707070}.lead{color:silver;font-size:21px;line-height:1.4}.cover{display:table-cell;vertical-align:middle;padding:0 20px}footer{position:fixed;width:100%;height:40px;left:0;bottom:0;color:#a0a0a0;font-size:14px}</style>
  </head>
  <body>
      <div class="cover"><h1>%error% <small>Error 401</small></h1><p class="lead">%error_description%</p><p>%error_uri%</p></div>
      <footer><p><a href="https://github.com/widen/cloudfront-auth">cloudfront-auth</a></p></footer>
  </body>
  </html>
  `;

  page = page.replace(/%error%/g, encodeURI(error));
  page = page.replace(/%error_description%/g, encodeURI(error_description));
  page = page.replace(/%error_uri%/g, encodeURI(error_uri));

  // Unauthorized access attempt. Reset token and nonce cookies
  const response = {
    "status": "401",
    "statusDescription": "Unauthorized",
    "body": page,
    "headers": {
      "set-cookie" : [
        {
          "key": "Set-Cookie",
          "value" : cookie.serialize('TOKEN', '', {
            path: '/',
            expires: new Date(1970, 1, 1, 0, 0, 0, 0)
          })
        },
        {
          "key": "Set-Cookie",
          "value" : cookie.serialize('NONCE', '', {
            path: '/',
            expires: new Date(1970, 1, 1, 0, 0, 0, 0)
          })
        }
      ],
    },
  };
  callback(null, response);
}

function internalServerError(callback) {
  let page = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
      <!-- Simple HttpErrorPages | MIT License | https://github.com/AndiDittrich/HttpErrorPages -->
      <meta charset="utf-8" /><meta http-equiv="X-UA-Compatible" content="IE=edge" /><meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>We've got some trouble | 500 - Internal Server Error</title>
      <style type="text/css">/*! normalize.css v5.0.0 | MIT License | github.com/necolas/normalize.css */html{font-family:sans-serif;line-height:1.15;-ms-text-size-adjust:100%;-webkit-text-size-adjust:100%}body{margin:0}article,aside,footer,header,nav,section{display:block}h1{font-size:2em;margin:.67em 0}figcaption,figure,main{display:block}figure{margin:1em 40px}hr{box-sizing:content-box;height:0;overflow:visible}pre{font-family:monospace,monospace;font-size:1em}a{background-color:transparent;-webkit-text-decoration-skip:objects}a:active,a:hover{outline-width:0}abbr[title]{border-bottom:none;text-decoration:underline;text-decoration:underline dotted}b,strong{font-weight:inherit}b,strong{font-weight:bolder}code,kbd,samp{font-family:monospace,monospace;font-size:1em}dfn{font-style:italic}mark{background-color:#ff0;color:#000}small{font-size:80%}sub,sup{font-size:75%;line-height:0;position:relative;vertical-align:baseline}sub{bottom:-.25em}sup{top:-.5em}audio,video{display:inline-block}audio:not([controls]){display:none;height:0}img{border-style:none}svg:not(:root){overflow:hidden}button,input,optgroup,select,textarea{font-family:sans-serif;font-size:100%;line-height:1.15;margin:0}button,input{overflow:visible}button,select{text-transform:none}[type=reset],[type=submit],button,html [type=button]{-webkit-appearance:button}[type=button]::-moz-focus-inner,[type=reset]::-moz-focus-inner,[type=submit]::-moz-focus-inner,button::-moz-focus-inner{border-style:none;padding:0}[type=button]:-moz-focusring,[type=reset]:-moz-focusring,[type=submit]:-moz-focusring,button:-moz-focusring{outline:1px dotted ButtonText}fieldset{border:1px solid silver;margin:0 2px;padding:.35em .625em .75em}legend{box-sizing:border-box;color:inherit;display:table;max-width:100%;padding:0;white-space:normal}progress{display:inline-block;vertical-align:baseline}textarea{overflow:auto}[type=checkbox],[type=radio]{box-sizing:border-box;padding:0}[type=number]::-webkit-inner-spin-button,[type=number]::-webkit-outer-spin-button{height:auto}[type=search]{-webkit-appearance:textfield;outline-offset:-2px}[type=search]::-webkit-search-cancel-button,[type=search]::-webkit-search-decoration{-webkit-appearance:none}::-webkit-file-upload-button{-webkit-appearance:button;font:inherit}details,menu{display:block}summary{display:list-item}canvas{display:inline-block}template{display:none}[hidden]{display:none}/*! Simple HttpErrorPages | MIT X11 License | https://github.com/AndiDittrich/HttpErrorPages */body,html{width:100%;height:100%;background-color:#21232a}body{color:#fff;text-align:center;text-shadow:0 2px 4px rgba(0,0,0,.5);padding:0;min-height:100%;-webkit-box-shadow:inset 0 0 100px rgba(0,0,0,.8);box-shadow:inset 0 0 100px rgba(0,0,0,.8);display:table;font-family:"Open Sans",Arial,sans-serif}h1{font-family:inherit;font-weight:500;line-height:1.1;color:inherit;font-size:36px}h1 small{font-size:68%;font-weight:400;line-height:1;color:#777}a{text-decoration:none;color:#fff;font-size:inherit;border-bottom:dotted 1px #707070}.lead{color:silver;font-size:21px;line-height:1.4}.cover{display:table-cell;vertical-align:middle;padding:0 20px}footer{position:fixed;width:100%;height:40px;left:0;bottom:0;color:#a0a0a0;font-size:14px}</style>
  </head>
  <body>
      <div class="cover"><h1>Internal Server Error <small>Error 500</small></h1></div>
      <footer><p><a href="https://github.com/widen/cloudfront-auth">cloudfront-auth</a></p></footer>
  </body>
  </html>
  `;

  const response = {
    "status": "500",
    "statusDescription": "Internal Server Error",
    "body": page,
  };
  callback(null, response);
}

const qs = require('querystring');
const fs = require('fs');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const jwkToPem = require('jwk-to-pem');
const auth = require('./auth.js');
const axios = require('axios');
var config;

exports.handler = (event, context, callback) => {
  if (typeof config == 'undefined') {
    config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
  }
  mainProcess(event, context, callback);
};

function mainProcess(event, context, callback) {
  // Get request, request headers, and querystring dictionary
  const request = event.Records[0].cf.request;
  const headers = request.headers;
  const queryDict = qs.parse(request.querystring);
  if (request.uri.startsWith(config.CALLBACK_PATH)) {
    /** Verify code is in querystring */
    if (!queryDict.code || !queryDict.state) {
      unauthorized("No code or state found.", callback);
    }
    /** Exchange code for authorization token */
    const postData = qs.stringify({
      'code': queryDict.code,
      'client_id': config.CLIENT_ID,
      'client_secret': config.CLIENT_SECRET,
      'redirect_uri': "https://bka.yden.us" + config.CALLBACK_PATH,
      'state': queryDict.state
    });
    axios.post(config.TOKEN_ENDPOINT, postData)
      .then(function(response) {
        var responseQueryString = qs.parse(response.data);
        /** Get authenticated user's login */
        if (responseQueryString.error) {
          internalServerError("Error while getting token: " + responseQueryString.error_description, callback);
        } else {
          const authorization = responseQueryString.token_type + ' ' + responseQueryString.access_token;
          axios.get('https://api.github.com/user', { headers: {'Authorization': authorization}})
            .then(function(response) {
              /** Check if authenticated user's login is a member of given org */
              if (!response.data.hasOwnProperty('login')) {
                internalServerError('Unable to find login', callback);
              }
              const username = response.data.login;
              var orgsGet = 'https://api.github.com/orgs/' + config.ORGANIZATION + '/members/' + username;
              axios.get(orgsGet, { headers: {'Authorization': authorization} })
                .then(function(response) {
                  /** Set cookie upon verified membership */
                  if (response.status == 204) {
                    const nextLocation = {
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
                              subject: username,
                              expiresIn: config.TOKEN_AGE,
                              algorithm: 'RS256'
                            } // Options
                          ))
                        }],
                      },
                    };
                    callback(null, nextLocation);
                  } else {
                    unauthorized('Unauthorized. User not a member of required organization.' + '\n' + orgsGet + '\n' + authorization, callback);
                  }
                })
                .catch(function(error) {
                  internalServerError('Error checking membership: ' + error.message, callback);
                });
            })
            .catch(function(error) {
              internalServerError('Error getting user: ' + error.message, callback);
            });
        }
      })
      .catch(function(error) {
        internalServerError('Error getting token: ' + error.message, callback);
      });
  } else if ("cookie" in headers
              && "TOKEN" in cookie.parse(headers["cookie"][0].value)) {
    // Verify the JWT, the payload email, and that the email ends with configured hosted domain
    jwt.verify(cookie.parse(headers["cookie"][0].value).TOKEN, config.PUBLIC_KEY.trim(), { algorithms: ['RS256'] }, function(err, decoded) {
      if (err) {
        switch (err.name) {
          case 'TokenExpiredError':
            redirect(request, headers, callback);
            break;
          case 'JsonWebTokenError':
            unauthorized(err.message, callback);
            break;
          default:
            unauthorized('Unauthorized. User ' + decoded.sub + ' is not permitted.', callback);
        }
      } else {
        callback(null, request);
      }
    });
  } else {
    redirect(request, headers, callback);
  }
}

function redirect(request, headers, callback) {
  // Redirect to Authorization Server
  var querystring = qs.stringify({
    "client_id": config.CLIENT_ID,
    "redirect_uri": "https://" + headers.host[0].value + config.CALLBACK_PATH,
    "scope": 'read:org',
    "state": request.uri
  });

  const response = {
    status: '302',
    statusDescription: 'Found',
    body: 'Redirecting to OAuth2 provider',
    headers: {
        location : [{
            key: 'Location',
            value: config.AUTHORIZATION_ENDPOINT + '?' + querystring
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

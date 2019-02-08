const axios = require('axios');

function isAuthorized(decoded, request, callback, unauthorized, internalServerError, config) {
  axios.get(config.JSON_EMAIL_LOOKUP)
    .then(function(response) {
      if (Array.isArray(response.data) && response.data.indexOf(decoded.sub) > -1) {
        callback(null, request);
      } else {
        unauthorized('Unauthorized', 'User ' + decoded.sub + ' is not permitted.', '', callback);
      }
    })
    .catch(function(error) {
      internalServerError(error.message, callback);
    });
}

function getSubject(decoded) { return decoded.payload.email; }

exports.isAuthorized = isAuthorized;
exports.getSubject = getSubject;

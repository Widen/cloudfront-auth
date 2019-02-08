const axios = require('axios');

function isAuthorized(decoded, request, callback, unauthorized, internalServerError, config) {
  axios.get(config.JSON_USERNAME_LOOKUP)
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

function getSubject(decoded) {
    if (decoded.payload.hasOwnProperty('upn')) {
        return decoded.payload.upn;
    } else {
        return 'Username not found';
    }
}

exports.isAuthorized = isAuthorized;
exports.getSubject = getSubject;

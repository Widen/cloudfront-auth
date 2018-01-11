const config = require('./config');

function isAuthorized(decoded, request, callback, unauthorized, internalServerError) {
  if (decoded.sub.endsWith(config.HOSTED_DOMAIN)) {
    callback(null, request);
  } else {
    unauthorized('Unauthorized. User ' + decoded.sub + ' is not permitted.', callback);
  }
}

exports.isAuthorized = isAuthorized;

function isAuthorized(decoded, request, callback, unauthorized, internalServerError, config) {
  if (decoded.sub.endsWith(config.HOSTED_DOMAIN)) {
    callback(null, request);
  } else {
    unauthorized('Unauthorized', 'User ' + decoded.sub + ' is not permitted.', '', callback);
  }
}

function getSubject(decoded) { return decoded.payload.email; }

exports.isAuthorized = isAuthorized;
exports.getSubject = getSubject;

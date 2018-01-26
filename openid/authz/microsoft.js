function isAuthorized(decoded, request, callback, unauthorized, internalServerError, config) {
  callback(null, request);
}

function getSubject(decoded) {
  return decoded.payload.unique_name;
}

exports.isAuthorized = isAuthorized;
exports.getSubject = getSubject;

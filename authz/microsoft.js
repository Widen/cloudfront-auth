function isAuthorized(_, request, callback) {
  callback(null, request)
}

function getSubject(decoded) {
  return decoded.payload.unique_name
}

exports.isAuthorized = isAuthorized
exports.getSubject = getSubject

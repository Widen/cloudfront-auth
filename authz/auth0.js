function isAuthorized(_, request, callback) {
  callback(null, request)
}

function getSubject(decoded) {
  return decoded.payload.email
}

exports.isAuthorized = isAuthorized
exports.getSubject = getSubject

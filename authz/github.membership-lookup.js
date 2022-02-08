function isAuthorized(_, request, callback) {
  callback(null, request)
}

function getSubject(data) {
  return data
}

exports.isAuthorized = isAuthorized
exports.getSubject = getSubject

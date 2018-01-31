const axios = require('axios');

function isAuthorized(decoded, request, callback, unauthorized, internalServerError, config) {
    callback(null, request);
}

function getSubject(data) { return data; }

exports.isAuthorized = isAuthorized;
exports.getSubject = getSubject;

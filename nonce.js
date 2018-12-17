const crypto = require('crypto');

module.exports.getNonce = function () {
    const nonce = crypto.randomBytes(32)
                        .toString('hex');
    const hash = crypto.createHmac('sha256', nonce)
                        .digest('hex');
    return [nonce, hash];
}

module.exports.validateNonce = function (nonce, hash) {
    const other = crypto.createHmac('sha256', nonce)
                        .digest('hex');
    return (other == hash);
}
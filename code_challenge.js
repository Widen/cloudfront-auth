const crypto = require('crypto');

module.exports.get = function (length) {
    const characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const charactersLength = characters.length;
    
    var codeChallenge    = '';
    
    for ( var i = 0; i < length; i++ ) {
        codeChallenge += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    const hash = crypto.createHash('sha256');
    hash.update(codeChallenge);

    return [codeChallenge, hash.digest('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')];
}

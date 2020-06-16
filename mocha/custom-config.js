const customConfig = require('../config/custom.config.js');
const assert = require('assert');

describe('Custom configuration', function () {
  describe('getConfig', function () {

    it('should return an object that has a property matching the value in the file', function (done) {
      customConfig.getConfig('./mocha/custom-config.json', 'us-east-1.my-website-auth', function (err, config) {
        try {
          assert.equal(config.AUTH_REQUEST.redirect_uri, 'http://my-website.com/_callback');
          assert(!err);
          done();
        } catch (err) {
          done(err);
        }
      });
    });

    it('should return an error when the file is not present', function (done) {
      customConfig.getConfig('./mocha/missing.json', 'us-east-1.my-website-auth', function (err, config) {
        try {
          assert(err);
          done();
        } catch (err) {
          done(err);
        }
      });
    });
  });
});

const genericConfig = require('../config/generic.config.js');
const assert = require('assert');
const AWS = require('aws-sdk-mock');

describe('Generic configuration', function () {
  describe('getConfig', function () {

    it('should return an object that has placeholders replaced with values from Parameter Store and Secrets Manager', function (done) {

      AWS.mock('SSM', 'getParametersByPath', {
        Parameters: [
          {
            Name: '/my-website-auth/domain-name',
            Value: 'my-website.com'
          },
          {
            Name: '/my-website-auth/callback-path',
            Value: '/_callback'
          }
        ]
      });

      AWS.mock('SecretsManager', 'getSecretValue', {
        SecretString: JSON.stringify({ 'private-key': 'my-private-key', 'public-key': 'my-public-key' })
      });

      genericConfig.getConfig('./mocha/generic-config.json', 'us-east-1.my-website-auth', function (err, config) {
        try {
          assert.equal(config.AUTH_REQUEST.redirect_uri, 'https://my-website.com/_callback');
          assert.equal(config.PRIVATE_KEY, 'my-private-key');
          assert.equal(config.PUBLIC_KEY, 'my-public-key');
          assert(!err);
          done();
        } catch (err) {
          done(err);
        } finally {
          AWS.restore('SecretsManager');
          AWS.restore('SSM');
        }
      });
    });

    it('should return an error when the file is not present', function (done) {
      genericConfig.getConfig('./mocha/missing.json', 'us-east-1.my-website-auth', function (err, config) {
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

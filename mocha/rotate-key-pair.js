const rotateKeyPair = require('../rotate-key-pair/index.js');
const assert = require('assert');
const AWS = require('aws-sdk-mock');
const sinon = require('sinon');

describe('Rotate key pair', function () {
  describe('handler', function () {

    it('should put secret value when step is createSecret', function () {
      this.timeout(30000);

      const putSecretValueSpy = sinon.spy();
      AWS.mock('SecretsManager', 'putSecretValue', putSecretValueSpy);

      // Call Lambda function handler
      const event = {
        Step: 'createSecret',
        SecretId: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:my-website-auth/key-pair-ABCDEF',
        ClientRequestToken: '123e4567-e89b-12d3-a456-426614174000'
      };
      rotateKeyPair.handler(event);

      // Verify that putSecretValue was called once with the same SecretId and ClientRequestToken
      const expectedParams = {
        SecretId: event.SecretId,
        ClientRequestToken: event.ClientRequestToken
      };
      sinon.assert.calledOnce(putSecretValueSpy);
      sinon.assert.calledWithMatch(putSecretValueSpy, expectedParams);

      // Verify that putSecretValue was called once with an RSA key pair as the SecretString
      const secret = JSON.parse(putSecretValueSpy.getCall(0).args[0].SecretString);
      assert(/^-----BEGIN RSA PRIVATE KEY-----\n[\s\S]*?-----END RSA PRIVATE KEY-----\n$/.test(secret['private-key']));
      assert(/^-----BEGIN PUBLIC KEY-----\n[\s\S]*?-----END PUBLIC KEY-----\n$/.test(secret['public-key']));

      AWS.restore('SecretsManager');
    });

    it('should not put secret value when step is not createSecret', function () {
      var putSecretValueSpy = sinon.spy();
      AWS.mock('SecretsManager', 'putSecretValue', putSecretValueSpy);

      // Call Lambda function handler
      const event = {
        Step: 'setSecret',
        SecretId: 'arn:aws:secretsmanager:us-east-1:123456789012:secret:my-website-auth/key-pair-ABCDEF',
        ClientRequestToken: '123e4567-e89b-12d3-a456-426614174000'
      };
      rotateKeyPair.handler(event);

      // Verify that putSecretValue was not called
      sinon.assert.notCalled(putSecretValueSpy);

      AWS.restore('SecretsManager');
    });

  });
});

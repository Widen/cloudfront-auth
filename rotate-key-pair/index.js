const { generateKeyPairSync } = require('crypto');
const aws = require('aws-sdk');

exports.handler = (event) => {
  if (event.Step == "createSecret") {
    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs1',
        format: 'pem'
      }
    });

    const secretsmanager = new aws.SecretsManager({ region: 'us-east-1' });

    const params = {
      SecretId: event.SecretId,
      ClientRequestToken: event.ClientRequestToken,
      SecretString: JSON.stringify({ 'private-key': privateKey, 'public-key': publicKey })
    };

    secretsmanager.putSecretValue(params, function (err, data) {
      if (err) {
        console.log(`Failed to rotate key pair for secret ${event.SecretId}`);
        console.log(err);
      } else {
        console.log(`Successfully rotated key pair for secret ${event.SecretId}`);
      }
    });
  }
};

const { generateKeyPair } = require('crypto');
const aws = require('aws-sdk');

exports.handler = (event) => {
  if (event.Step == "createSecret") {
    console.log(`Rotating key pair for secret ${event.SecretId}`);

    generateKeyPair('rsa', {
      modulusLength: 4096,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs1',
        format: 'pem'
      }
    }, (err, publicKey, privateKey) => {
      if (err) {
        console.log(err);
      } else {
        const secretsmanager = new aws.SecretsManager({ region: 'us-east-1' });

        const params = {
          SecretId: event.SecretId,
          ClientRequestToken: event.ClientRequestToken,
          SecretString: JSON.stringify({ 'private-key': privateKey, 'public-key': publicKey })
        };

        secretsmanager.putSecretValue(params, function (err, data) {
          if (err) {
            console.log(err);
          } else {
            console.log(`Successfully rotated key pair for secret ${event.SecretId}`)
          }
        });
      }
    });
  }
}

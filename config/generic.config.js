const fsPromises = require('fs').promises;
const aws = require('aws-sdk');
const fillTemplate = require('es6-dynamic-template');

module.exports.getConfig = function (fileName, functionName, callback) {
  // Remove the 'us-east-1.' prefix that exists on Lambda@Edge replicas
  const name = functionName.replace(/^us-east-1./, '');

  // Read config file
  const readFilePromise = fsPromises.readFile(fileName, 'utf8');

  // Get parameters from SSM Parameter Store
  const ssm = new aws.SSM({ region: 'us-east-1' });
  const getParametersByPathPromise = ssm.getParametersByPath({ Path: `/${name}` }).promise();

  // Get key pair from Secrets Manager
  const secretsmanager = new aws.SecretsManager({ region: 'us-east-1' });
  const getSecretValuePromise = secretsmanager.getSecretValue({ SecretId: `${name}/key-pair` }).promise();

  Promise.all([readFilePromise, getParametersByPathPromise, getSecretValuePromise]).then(function (values) {
    const template = values[0];
    const ssmParameters = values[1].Parameters;
    const secretString = values[2].SecretString;

    // Flatten parameters into name-value pairs
    const parameters = ssmParameters.reduce(function (map, obj) {
      map[obj.Name.slice(name.length + 2)] = obj.Value;
      return map;
    }, {});

    // Convert secret to name-value pairs
    const secrets = JSON.parse(secretString);

    // Parse config file, replacing template placeholders with parameters and secrets
    const config = JSON.parse(template, (key, value) =>
      typeof value === 'string' ? fillTemplate(value, { ...parameters, ...secrets }) : value
    );

    callback(null, config);
  }).catch(function (err) {
    callback(err);
  });
};

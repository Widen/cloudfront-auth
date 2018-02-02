const shell = require('shelljs');
const prompt = require('prompt');
const fs = require('fs');
const axios = require('axios');
const colors = require('colors/safe');
const url = require('url');

var config = { AUTH_REQUEST: {}, TOKEN_REQUEST: {} };

prompt.message = colors.blue(">");
prompt.start();
prompt.get({
  properties: {
    method: {
      description: colors.red("Authentication methods:\n    (1) Google\n    (2) Microsoft\n    (3) GitHub\n    (4) Custom\n\n    Select an authentication method")
    }
  }
}, function (err, result) {
  switch (result.method) {
    case '1':
      googleConfiguration();
      break;
    case '2':
      microsoftConfiguration();
      break;
    case '3':
      githubConfiguration();
      break;
    case '4':
      //customConfiguration();
      console.log("Custom configuration not yet supported. Stopping build...");
      process.exit(1);
    default:
      console.log("Method not recognized. Stopping build...");
      process.exit(1);
  }
});

function microsoftConfiguration() {
  prompt.message = colors.blue(">>");
  prompt.start();
  prompt.get({
    properties: {
      TENANT: {
        message: colors.red("Tenant"),
        required: true
      },
      CLIENT_ID: {
        message: colors.red("Client ID"),
        required: true
      },
      CLIENT_SECRET: {
        message: colors.red("Client Secret"),
        required: true
      },
      REDIRECT_URI: {
        message: colors.red("Redirect URI"),
        required: true
      },
      SESSION_DURATION: {
        message: colors.red("Session Duration (seconds)"),
        required: true
      }
    }
  }, function(err, result) {
    config.PRIVATE_KEY = fs.readFileSync('build/id_rsa', 'utf8');
    config.PUBLIC_KEY = fs.readFileSync('build/id_rsa.pub', 'utf8');
    config.DISCOVERY_DOCUMENT = 'https://login.microsoftonline.com/' + result.TENANT + '/.well-known/openid-configuration';
    config.SESSION_DURATION = parseInt(result.SESSION_DURATION, 10);

    config.CALLBACK_PATH = url.parse(result.REDIRECT_URI).pathname;

    config.AUTH_REQUEST.client_id = result.CLIENT_ID;
    config.AUTH_REQUEST.redirect_uri = result.REDIRECT_URI;
    config.AUTH_REQUEST.response_type = 'code';
    config.AUTH_REQUEST.response_mode = 'query';
    config.AUTH_REQUEST.scope = 'openid email';

    config.TOKEN_REQUEST.client_id = result.CLIENT_ID;
    config.TOKEN_REQUEST.grant_type = 'authorization_code';
    config.TOKEN_REQUEST.redirect_uri = result.REDIRECT_URI;
    config.TOKEN_REQUEST.client_secret = result.CLIENT_SECRET;

    shell.cp('./authz/microsoft.js', './auth.js');
    shell.cp('./authn/openid.index.js', './index.js');
    writeConfig(config, zipDefault);
    shell.exec('zip -q cloudfront-auth.zip config.json index.js package-lock.json package.json auth.js -r node_modules');
  });
}

function googleConfiguration() {
  prompt.message = colors.blue(">>");
  prompt.start();
  prompt.get({
    properties: {
      CLIENT_ID: {
        message: colors.red("Client ID"),
        required: true
      },
      CLIENT_SECRET: {
        message: colors.red("Client Secret"),
        required: true
      },
      REDIRECT_URI: {
        message: colors.red("Redirect URI"),
        required: true
      },
      HD: {
        message: colors.red("Hosted Domain"),
        required: true
      },
      SESSION_DURATION: {
        pattern: /^[0-9]*$/,
        description: colors.red("Session Duration (seconds)"),
        message: colors.green("Entry must only contain numbers"),
        required: true
      },
      AUTHZ: {
        description: colors.red("Authorization methods:\n   (1) Hosted Domain - verify email's domain matches that of the given hosted domain\n   (2) HTTP Email Lookup - verify email exists in JSON array located at given HTTP endpoint\n   (3) Google Groups Lookup - verify email exists in one of given Google Groups\n\n   Select an authorization method")
      }
    }
  }, function(err, result) {
    config.PRIVATE_KEY = fs.readFileSync('build/id_rsa', 'utf8');
    config.PUBLIC_KEY = fs.readFileSync('build/id_rsa.pub', 'utf8');
    config.DISCOVERY_DOCUMENT = 'https://accounts.google.com/.well-known/openid-configuration';
    config.SESSION_DURATION = parseInt(result.SESSION_DURATION, 10);

    config.CALLBACK_PATH = url.parse(result.REDIRECT_URI).pathname;
    config.HOSTED_DOMAIN = result.HD;

    config.AUTH_REQUEST.client_id = result.CLIENT_ID;
    config.AUTH_REQUEST.response_type = 'code';
    config.AUTH_REQUEST.scope = 'openid email';
    config.AUTH_REQUEST.redirect_uri = result.REDIRECT_URI;
    config.AUTH_REQUEST.hd = result.HD;

    config.TOKEN_REQUEST.client_id = result.CLIENT_ID;
    config.TOKEN_REQUEST.client_secret = result.CLIENT_SECRET;
    config.TOKEN_REQUEST.redirect_uri = result.REDIRECT_URI;
    config.TOKEN_REQUEST.grant_type = 'authorization_code';

    shell.cp('./authn/openid.index.js', './index.js');
    switch (result.AUTHZ) {
      case '1':
        shell.cp('./authz/google.hosted-domain.js', './auth.js');
        writeConfig(config, zipDefault);
        shell.exec('zip -q cloudfront-auth.zip config.json index.js package-lock.json package.json auth.js -r node_modules');
        break;
      case '2':
        shell.cp('./authz/google.http-email-lookup.js', './auth.js');
        prompt.start();
        prompt.message = colors.blue(">>>");
        prompt.get({
          properties: {
            JSON_EMAIL_LOOKUP: {
              description: colors.red("JSON email lookup endpoint")
            }
          }
        }, function (err, result) {
          config.JSON_EMAIL_LOOKUP = result.JSON_EMAIL_LOOKUP;
          writeConfig(config, zipDefault);
        });
        break;
      case '3':
        googleGroupsConfiguration();
        break;
      default:
        console.log("Method not recognized. Stopping build...");
    }
  });
}

function googleGroupsConfiguration() {
  prompt.start();
  prompt.message = colors.blue(">>>");
  prompt.get({
    properties: {
      SERVICE_ACCOUNT: {
        description: colors.red("Service Account"),
        required: true
      }
    }
  }, function (err, result) {
    if (!shell.test('-f', './google-authz.json')) {
      console.log('Need google-authz.json to use google groups authentication. Stopping build...');
    } else {
      shell.cp('./authz/google.groups-lookup.js', './auth.js');
      config.SERVICE_ACCOUNT = result.SERVICE_ACCOUNT;
      writeConfig(config, zipGoogleGroups);
    }
  });
}

function githubConfiguration() {
  prompt.message = colors.blue(">>");
  prompt.start();
  prompt.get({
    properties: {
      CLIENT_ID: {
        message: colors.red("Client ID"),
        required: true
      },
      CLIENT_SECRET: {
        message: colors.red("Client Secret"),
        required: true
      },
      REDIRECT_URI: {
        message: colors.red("Redirect URI"),
        required: true
      },
      SESSION_DURATION: {
        pattern: /^[0-9]*$/,
        description: colors.red("Session Duration (seconds)"),
        message: colors.green("Entry must only contain numbers"),
        required: true
      },
      ORGANIZATION: {
        description: colors.red("Organization"),
        required: true
      }
    }
  }, function(err, result) {
    axios.get('https://api.github.com/orgs/' + result.ORGANIZATION)
      .then(function (response) {
        if (response.status == 200) {
          config.PRIVATE_KEY = fs.readFileSync('build/id_rsa', 'utf8');
          config.PUBLIC_KEY = fs.readFileSync('build/id_rsa.pub', 'utf8');
          config.SESSION_DURATION = parseInt(result.SESSION_DURATION, 10);
          config.CALLBACK_PATH = url.parse(result.REDIRECT_URI).pathname;
          config.ORGANIZATION = result.ORGANIZATION;
          config.AUTHORIZATION_ENDPOINT = 'https://github.com/login/oauth/authorize';
          config.TOKEN_ENDPOINT = 'https://github.com/login/oauth/access_token';

          config.AUTH_REQUEST.client_id = result.CLIENT_ID;
          config.AUTH_REQUEST.redirect_uri = result.REDIRECT_URI;
          config.AUTH_REQUEST.scope = 'read:org user:email';

          config.TOKEN_REQUEST.client_id = result.CLIENT_ID;
          config.TOKEN_REQUEST.client_secret = result.CLIENT_SECRET;
          config.TOKEN_REQUEST.redirect_uri = result.REDIRECT_URI;

          shell.cp('./authz/github.membership-lookup.js', './auth.js');
          shell.cp('./authn/oauth2.index.js', './index.js');
          writeConfig(config, zipDefault);
        } else {
          console.log("Organization could not be verified (code " + response.status + "). Stopping build...");
        }
      })
      .catch(function(error) {
        console.log("Organization could not be verified. Stopping build... (" + error.message + ")");
      });
  });
}

function zipDefault() {
  shell.exec('zip -q cloudfront-auth.zip config.json index.js package-lock.json package.json auth.js -r node_modules');
}

function zipGoogleGroups() {
  shell.exec('zip -q cloudfront-auth.zip config.json index.js package-lock.json package.json auth.js google-authz.json -r node_modules');
}

function writeConfig(result, callback) {
  fs.writeFile('config.json', JSON.stringify(result, null, 4), (err) => {
    if (err) throw err;
    callback();
  });
}

const shell = require('shelljs');
const prompt = require('prompt');
const fs = require('fs');
const axios = require('axios');
const colors = require('colors/safe');
const url = require('url');

colors.blue("Beginning tests... be sure config contains all required values or all tests will fail.");
prompt.message = colors.blue(">");
prompt.start();
prompt.get({
  properties: {
    AUTHN: {
      description: colors.red("Authentication methods:\n    (1) Google\n    (2) Microsoft\n    (3) GitHub\n    (4) Custom\n\n    Select an authentication method")
    },
  }
}, function (err, result) {
  switch (result.method) {
    case '1':
      googleTest();
      break;
    case '2':
      microsoftTest();
      break;
    case '3':
      githubTest();
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

function googleTest() {
    prompt.message = colors.blue(">>");
    prompt.start();
    prompt.get({
    properties: {
      AUTHZ: {
        description: colors.red("Authorization methods:\n   (1) Hosted Domain - verify email's domain matches that of the given hosted domain\n   (2) HTTP Email Lookup - verify email exists in JSON array located at given HTTP endpoint\n   (3) Google Groups Lookup - verify email exists in one of given Google Groups\n\n   Select an authorization method")
      }
    }
  }, function(err, result) {

  });
}

function microsoftTest() {
    prompt.message = colors.blue(">>");
    prompt.start();
    prompt.get({
    properties: {
        AUTHZ: {
        description: colors.red("Authorization methods:\n   (1) Azure AD Login (default)\n   (2) JSON Username Lookup\n\n   Select an authorization method")
        }
    }
    }, function(err, result) {
        
    });
}

function githubTest() {
    
}
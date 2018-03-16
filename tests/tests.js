const fs = require('fs');
const opn = require('opn');
const prompt = require('prompt');
const colors = require('colors/safe');
const http = require('http');
const url = require('url');
const qs = require('querystring');
const shell = require('shelljs');
var beautify = require('json-beautify');
var ngrok = require('ngrok');
var dateFormat = require('dateformat');
var AWS = require('aws-sdk');
var logName = dateFormat(Date.now(), "mm-dd-yyyy-hh:MM:ss");
let server;

// Check for distribution argument
const DISTRIBUTION = process.argv.slice(2)[0];
if(!fs.existsSync("distributions/" + DISTRIBUTION)) {
  console.log(colors.red("Distribution '" + DISTRIBUTION + "' does not exist. Stopping test..."));
  process.exit();
}

shell.mkdir('-p', 'distributions/' + DISTRIBUTION + "/logs");  

// Check for config-test.json
if(!fs.existsSync("distributions/" + DISTRIBUTION + "/config-test.json")) {
  console.log(colors.red("config-test.json does not exist in '" + DISTRIBUTION + "'. Add config-test.json and restart. Stopping test..."));
  process.exit();
}

// Load configs
var config = JSON.parse(fs.readFileSync("distributions/" + DISTRIBUTION + "/config.json", 'utf8'));
var testConfig = JSON.parse(fs.readFileSync("distributions/" + DISTRIBUTION + "/config-test.json"));

// Update AWS config
AWS.config.update({
  accessKeyId: testConfig.aws.accessKeyId,
  secretAccessKey: testConfig.aws.secretAccessKey,
  region: testConfig.aws.region
});
var lambda = new AWS.Lambda();

// Start local server
server = http.createServer();
server.on('request', function(req, res){
  var querystring = qs.parse(url.parse(req.url).query);
  res.writeHead(200, {'Content-Type': 'text/html'});
  if (querystring.code != undefined) {
    // Write simple HTML page with copy button for code
    var codeHtml = '<html>' +
    '    <head>' +
    '        <title>cloudfront-auth testing</title>' +
    '        <script>' +
    '            function copyCode() {' +
    '                var copyField = document.getElementById("codeField");' +
    '                copyField.select();' +
    '                document.execCommand("Copy");' +
    '            }' +
    '        </script>' +
    '    </head>' +
    '    <body>' +
    '        <input type="text" value="' + querystring.code + '" id="codeField">' +
    '        <button onclick="copyCode()">Copy code</button>' +
    '    </body>'
    '</html>';
    res.write(codeHtml);
  }
  res.end();
});
server.listen(testConfig.port);

// Toggle ngrok auth if necessary
switch(testConfig.auth) {
  case("y"):
    // Generate password for ngrok
    var generator = require('generate-password');
    var username = generator.generate({
      length: 10,
      numbers: true
    });
    var password = generator.generate({
      length: 10,
      numbers: true
    });
    console.log(colors.red("USERNAME: ") + colors.green(username));
    console.log(colors.red("PASSWORD: ") + colors.green(password));
    ngrok.connect({
      addr: testConfig.port,
      auth: username + ':' + password    
    }, function(err, url){
      if (err) {
        console.log(err);
        exit(1);
      }
      setupRedirect(url, testConfig.lambdaFunction);
    });
    break;
  case("n"):
  default:
    ngrok.connect(testConfig.port, function(err, url){
      if (err) {
        console.log(err);
        exit(1);
      }
      setupRedirect(url, testConfig.lambdaFunction);
    });
}

// Prompt user to enter temporary ngrok url as redirect uri
function setupRedirect(url, lambdaFunction) {
  prompt.message = colors.blue(">");
  prompt.start();
  prompt.get({
    properties: {
      wait: {
        description: colors.red("Add " + colors.green(url + config.CALLBACK_PATH) + " to your list of redirect URIs. Press enter when finished"),
        required: false,
      }
    }
  }, function (err, result) {
    // Setup initial lambda request
    var params = {
      FunctionName: lambdaFunction,
      Payload: initialRequestPayload(url),
      LogType: "Tail"
    }

    // Update log
    fs.writeFileSync('distributions/' + DISTRIBUTION + '/logs/' + logName + '.log', "*/ Initial Request Payload /*\n" + beautify(JSON.parse(params.Payload), null, 2, 80));

    // Invoke lambda
    lambda.invoke(params, function(err, data) {
      if (err) {
        console.log(err, err.stack);
      } else {
        // Update log
        fs.appendFileSync('distributions/' + DISTRIBUTION + '/logs/' + logName + '.log', "\n*/ Initial Request Response /*\nStatus Code: " + data.StatusCode + "\nExecuted Version: " + data.ExecutedVersion + "\nLog Result:\n" + new Buffer(data.LogResult, 'base64').toString('ascii') + "\nPayload:\n" + beautify(JSON.parse(data.Payload), null, 2, 80));
        var payload = JSON.parse(data.Payload);
        console.log(payload.headers.location[0].value);
        opn(payload.headers.location[0].value);

        // Prompt user for code on open page
        prompt.message = colors.blue(">");
        prompt.start();
        prompt.get({
          properties: {
            code: {
              description: colors.red("Enter the code in your browser received from authentication provider"),
              required: false,
            }
          }
        }, function (err, result) {
          // Setup callback lambda request
          var params = {
            FunctionName: lambdaFunction,
            Payload: callbackPayload(url, result.code),
            LogType: "Tail"
          }

          // Update log
          fs.appendFileSync('distributions/' + DISTRIBUTION + '/logs/' + logName + '.log', "\n\n*/ Callback Payload /*\n" + beautify(JSON.parse(params.Payload), null, 2, 80));

          // Invoke lambda
          lambda.invoke(params, function(err, data) {
            if (err) {
              console.log(err, err.stack);
            } else {
              // Update log
              fs.appendFileSync('distributions/' + DISTRIBUTION + '/logs/' + logName + '.log', "\n*/ Callback Response /*\nStatus Code: " + data.StatusCode + "\nExecuted Version: " + data.ExecutedVersion + "\nLog Result:\n" + new Buffer(data.LogResult, 'base64').toString('ascii') + "\nPayload:\n" + beautify(JSON.parse(data.Payload), null, 2, 80));

              // Setup token lambda request
              var params = {
                FunctionName: lambdaFunction,
                Payload: tokenRequestPayload(url, JSON.parse(data.Payload).headers["set-cookie"][0].value),
                LogType: "Tail"
              }

              // Update log
              fs.appendFileSync('distributions/' + DISTRIBUTION + '/logs/' + logName + '.log', "\n\n*/ Token Payload /*\n" + beautify(JSON.parse(params.Payload), null, 2, 80));

              // Invoke lambda
              lambda.invoke(params, function(err, data) {
                if (err) {
                  console.log(err, err.stack);
                } else {
                  // Update log                  
                  fs.appendFileSync('distributions/' + DISTRIBUTION + '/logs/' + logName + '.log', "\n*/ Token Response /*\nStatus Code: " + data.StatusCode + "\nExecuted Version: " + data.ExecutedVersion + "\nLog Result:\n" + new Buffer(data.LogResult, 'base64').toString('ascii') + "\nPayload:\n" + beautify(JSON.parse(data.Payload), null, 2, 80));
                }

                // Notify user of test end and kill ngrok/local server
                console.log(colors.green("Log created at /distributions/" + DISTRIBUTION + "/logs/" + logName + ".log"));
                server.close();
                ngrok.disconnect();
                ngrok.kill();
                process.exit();
              });
            }
          });
        });
      }
    });
  });
}

/** Lambda test payloads **/
function initialRequestPayload(url) {
  var payload = {
    "Records": [
      {
        "cf": {
          "request": {
          "headers": {
            "host": [
              {
                "value": "example.com",
                "key": "Host"
              }
              ],
              "user-agent": [
              {
                "value": "test-agent",
                "key": "User-Agent"
              }
            ]
          },
          "clientIp": "1234:abcd::5678:1234",
          "uri": "/",
          "method": "GET",
          "querystring": ""
          },
          "config": {
            "distributionId": "EXAMPLE",
            "test": url
          }
        }
      }
    ]
  };
  return JSON.stringify(payload).replace(/\r?\n|\r/g, "");
}

function callbackPayload(url, code) {
  var payload = {
    "Records": [
      {
        "cf": {
          "request": {
            "headers": {
              "host": [
                {
                  "value": "example.com",
                  "key": "Host"
                }
              ],
              "user-agent": [
                {
                  "value": "test-agent",
                  "key": "User-Agent"
                }
              ]
            },
            "clientIp": "2001:cdba::3257:9652",
            "uri": "/_callback",
            "method": "GET",
            "querystring": "code=" + code + "&state=%2f&session_state=fc350b67-673e-4ecd-98e7-3c2f5a875d0a"
          },
          "config": {
            "distributionId": "EXAMPLE",
            "test": url
          }
        }
      }
    ]
  };
  return JSON.stringify(payload).replace(/\r?\n|\r/g, "");
}

function tokenRequestPayload(url, cookie) {
  var payload = {
    "Records": [
      {
        "cf": {
          "request": {
            "headers": {
              "host": [
                {
                  "value": "example.com",
                  "key": "Host"
                }
              ],
              "user-agent": [
                {
                  "value": "test-agent",
                  "key": "User-Agent"
                }
              ],
              "cookie": [
                {
                  "value": cookie,
                  "key": "Cookie"
                }
              ]
            },
            "clientIp": "1234:abcd::5678:1234",
            "uri": "/",
            "method": "GET",
            "querystring": ""
          },
          "config": {
            "distributionId": "EXAMPLE",
            "test": url
          }
        }
      }
    ]
  }
  return JSON.stringify(payload).replace(/\r?\n|\r/g, "");
}
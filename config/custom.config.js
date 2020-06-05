const fsPromises = require('fs').promises;

module.exports.getConfig = function (functionName, callback) {
  // Read config file
  fsPromises.readFile('config.json', 'utf8').then(function (configText) {
    // Parse config file
    const config = JSON.parse(configText);
    
    callback(null, config);
  }).catch(function (err) {
    callback(err);
  });
};

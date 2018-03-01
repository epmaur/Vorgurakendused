const request = require('request')

function post(DESTINATION, DATA) {
  console.log('destination:', DESTINATION);
  return new Promise(function(resolve, reject) {
      request.post({
        uri: DESTINATION,
        body: JSON.stringify(DATA)
      }, function() {
        resolve(true);
      }).on('error', function(err) {
        console.log('POST Something happend');
      })
  })
}

module.exports.post = post;

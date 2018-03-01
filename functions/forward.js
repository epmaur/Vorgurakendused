const request = require('request');

function forward(DESTINATIONS, DATA) {
    DESTINATIONS.forEach(function(entry) {
      console.log("Forward to:" + entry);
      request.get({
        uri: entry
      }).on('error', function(err) {
        console.log('FORWARD Something happend');
      })
    })
}

module.exports.forward = forward;

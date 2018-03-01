const request = require('request');

function getPeers(port) {
  let filename = './peers-'+ port +'.json';
  return require(filename);
  /*
  return new Promise(function(resolve, rej) {
    request.get({
      uri: url
        },
      function(req, res, body) {
        // console.log('PEERS req:', req, ', res:', res);
        // resolve(res);
        resolve(['http://192.168.0.15:1215/a']);
      }).on('error', function(err) {
        console.log('PEERS Something happend');
      })
  })

  var data = '[{"ip" : "127.0.0.0.1:7070"},{"ip" : "127.0.0.0.1:10100"}]';
  return data;*/
}

module.exports.getPeers = getPeers;

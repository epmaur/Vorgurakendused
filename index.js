const http = require('http');
const url = require('url');
const HttpDispatcher = require('httpdispatcher');
const dispatcher = new HttpDispatcher();
const dl = require('./functions/download');
const sR = require('./functions/post');
const fw = require('./functions/forward');
const pe = require('./functions/peers');
const ipaddr = require('ipaddr.js');

const LAZINESS = 0.5;
let PORT = null;
const PEER_DESTINATION = 'http://192.168.3.11:1215/getpeers';
const INTERNAL = 'http://localhost:1215/file';

let unhandledResponses = {};
let START_ID = 122;
let DESTINATIONS = ['http://192.168.0.15:1215/download'];


function returnUrlParam(request) {
  console.log('request' , request.url);
  let params = url.parse(request.url, true).query;
  console.log('params', params);
  if(params.url != null) {
    console.log();
    return params.url.includes('http') ? params.url : 'http://' + params.url;
  }
  return null;
}

function returnIdParam(request) {
  let params = url.parse(request.url, true).query;
  if(params.id != null) {
    return params.id;
  }
  NEW_ID = START_ID + 1;
  START_ID = NEW_ID;
  return NEW_ID;
}

function createOrReturnId(req) {
  return returnIdParam(req) == null ? START_ID + 1 : returnIdParam(req);
}

function downloadOrNot() {
  return true;
  //return Math.floor(Math.random() * 2) + 1 > 1;
}

function ipAddressHandler(req) {
  console.log('ipAddressReq', req.connection.remoteAddress);
  let ipString = req.connection.remoteAddress;
  if (ipaddr.IPv4.isValid(ipString)) {
  } else if (ipaddr.IPv6.isValid(ipString)) {
    let ip = ipaddr.IPv6.parse(ipString);
    console.log('ip', ip.toIPv4Address().toString());

    if (ip.isIPv4MappedAddress()) {
      return ip.toIPv4Address().toString();
    }
  }
}

function handleNewDestinations() {
  //console.log('Pulled new destinations');
  //console.log('DESTINATIONS:', DESTINATIONS);
  DESTINATIONS = [];
  var peers = pe.getPeers(PORT);
  var ping = require('ping');

  const request = require('request');
  for(let i = 0; i < 1; i++) {
        let item = peers[i].ip;
        request('http://localhost:7070/check', { json: true }, function(err, res, body){
            if (err) { return console.log(err); }
            console.log('body',body);
            console.log('res', res);
        });
        /*
        ping.sys.probe(item, function(isAlive){
            var msg = isAlive ? 'host ' + item + ' is alive' : 'host ' + item + ' is dead';
        });
        */

    }
  /*
  for(let i = 0; i < 2; i++) {
      // let item = resolve[Math.floor(Math.random() * 2)];
      let item = peers[i].ip;
      if (!DESTINATIONS.includes(item)) {
          DESTINATIONS.push(item);
      }
  }
  */

  /*
  pe.getPeers(PEER_DESTINATION).then(function(resolve, reject) {
    //console.log('resolve:', resolve);
    for(let i = 0; i < 3; i++) {
      // let item = resolve[Math.floor(Math.random() * 2)];
      let item = resolve[0];
      if (!DESTINATIONS.includes(item)) {
        DESTINATIONS.push(item);
      }
    }
  });
  */
}

function handleRequest(request, response){
  try {
    dispatcher.dispatch(request, response);
  } catch(error) {
    response.end(error);
  }
}

function putToUnhandled(id, req, res) {
  return new Promise(function(resolve, reject) {
    const newID = createOrReturnId(req);
    unhandledResponses[createOrReturnId(req)] = res;
    resolve(newID);
  });
}

function triggerDownloader(req, res, trigger) {
  return new Promise(function(resolve, reject) {
    dl.download(returnUrlParam(req)).then(function(resolves, rej) {
      resolve({
      'status': 200,
      'mime-type': resolves.headers['content-type'],
      'content': new Buffer(resolves.body).toString('base64')
      });
    });
  });
}

function addIdsToDestination (param, urlparam) {
  return new Promise(function(resolve, reject) {
    const NEW_DESTINATIONS = DESTINATIONS;
    DESTINATIONS = [];
    NEW_DESTINATIONS.forEach(function(entry) {
      let string = entry.includes('id') ? entry + urlparam : entry + param + urlparam;
      DESTINATIONS.push(string);
    });
    resolve(DESTINATIONS);
  })
}

function startServer(port) {
    dispatcher.onGet('/download', function (req, res) {
        if (downloadOrNot() || DESTINATIONS.length === 0) {
            console.log('Starting download...');
            triggerDownloader(req, res).then(function (resolve, reject) {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(resolve));
                //sR.post('http://' + ipAddressHandler(req) +':1215/file?id=' + returnIdParam(req), resolve).then(function(resolve, reject) {
                sR.post('http://localhost:1215/file?id=' + returnIdParam(req), resolve).then(function (resolve, reject) {

                    console.log('Download was complete')
                });
                console.log('Download to client was ok');
            });
        } else {
            putToUnhandled(returnIdParam(req), req, res).then(
                function (resolve, reject) {
                    addIdsToDestination("?id=" + resolve, "&url=" + decodeURIComponent(returnUrlParam(req))).then(function (resolves, rejects) {
                        fw.forward(resolves, null);
                    });
                }
            );
        }
    });

    dispatcher.onGet('/check', function (req, res) {
        console.log('checkRequest', req.connection.remoteAddress);
        /*
        res.setHeader('Content-Type', 'application/json');
        sR.post('http://localhost:1215/', 'all good').then(function (resolve, reject) {
        });
        res.end(JSON.stringify(resolve));
        */

    });

    dispatcher.onPost('/file', function (req, res) {
        console.log('Got post request, Checking Id.');
        const postId = returnIdParam(req);
        if (postId !== null && postId in unhandledResponses) {
            unHandled = unhandledResponses[postId];
            sR.post('http://' + ipAddressHandler(unHandled) + ':1215/file?id=' + postId, req.bodyH).then(function (resolve, reject) {
                console.log('Return post request')
            });
            console.log('Return post request');
            delete unhandledResponses[postId];
        } else {
            console.log('Some twat sended me something');
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({error: 404}));
        }
    });

    const server = http.createServer(handleRequest);

    server.listen(port, function () {
        PORT = port;
        console.log("Server listening on: http://localhost:%s", port);
        setInterval(handleNewDestinations, 1000);
    });
}

module.exports.start = function (port) {
    startServer(port);
};

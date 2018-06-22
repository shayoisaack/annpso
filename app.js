var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var Promise = require('promise');

app.set('views', __dirname + '/views');
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));
app.get('/', function(req, res) {
    res.render('app.ejs');
});

//initiate reservoir and pass to client
var simulate = require('./simulator2d-server.js').simulate;
var Res = require('./res2d.js').Res;

var res = new Res(50, 50);

io.on('connection', function(socket) {
    console.log('connected');

    //when user is connected pass him the reservoir 
    socket.emit('reservoir', res);

    //receive command to simulate
    socket.on('simulate', function(res, wells) {
        io.emit('simulation-result', simulate(res, wells));
    });

    socket.on('simulate-simulator', function(resObj, wellsObj) {
        console.log('res ', resObj);
        var promise = new Promise(function(resolve, reject) {
            try {
                var result = simulate(res, wellsObj, 1);
            } catch (err) {
                reject(err);
            }
            resolve(result);
        });
        promise.then(function(result) {
            io.emit('simulate-simulator-final', result);
        });
        console.log('after promise..');
    });
    //when disconnected
    socket.on('disconnect', function() {
        console.log('disconnected');
    });
});

http.listen(3000, function() {
    console.log('listening on *:3000');
});
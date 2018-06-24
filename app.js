const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const Promise = require('promise');
const clone = require('clone');


io.set('heartbeat timeout', 60000); 
io.set('heartbeat interval', 60000);

app.set('views', __dirname + '/views');
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));
app.get('/', function(req, res) {
    res.render('app.ejs');
});

//initiate reservoir and pass to client
let simulate = require('./simulator2d-server.js').simulate;
let Res = require('./res2d.js').Res;
const Well = require('./well.js').Well;

let res = new Res(30, 30);
let wells = [new Well(7, 8), new Well(2, 3)];

io.on('connection', function(socket) {
    console.log('connected');

    //when user is connected pass him the reservoir 
    socket.emit('reservoir', res, wells);

    //receive command to simulate
    socket.on('simulate', function(res, wells) {
        io.emit('simulation-result', simulate(res, wells));
    });

    socket.on('simulate-simulator', function(resObj, wellsObj) {
        console.log('res ', resObj);
        // let promise = new Promise(function(resolve, reject) {
        //     try {
        //         res = simulate(res, wellsObj, 1);
        //     } catch (err) {
        //         reject(err);
        //     }
        //     resolve(res);
        // });
        // promise.then(function(result) {
        // 	console.log('resolving promise');
        //     io.emit('simulate-simulator-final', res);
        // });
        res = simulate(res, wellsObj, 5);//[{condition: 'pressure', loc: {x: 7, y: 8}, p_bh: 3350}], 10);
        io.emit('simulate-simulator-final', clone(res), clone(wellsObj));
    });
    //when disconnected
    socket.on('disconnect', function() {
        console.log('disconnected');
    });
});

http.listen(3000, function() {
    console.log('listening on *:3000');
});
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.set('views', __dirname + '/views');
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));
app.get('/', function(req, res){
 res.render('app.ejs');
});

//initiate reservoir and pass to client
var simulate = require('./simulator2d-app.js').simulate;
var Res = require('./res2d.js').Res;

var res = new Res(5, 5);

io.on('connection', function(socket){
  console.log('connected'); 

  //when user is connected pass him the reservoir 
  socket.emit('reservoir', res);

  //receive command to simulate
  socket.on('simulate', function(res, wells){
  	io.emit('simulation-result', simulate(res, wells));
  });
  // socket.on('chat message', function(msg){
  //   console.log('message: ' + msg);
  //   io.emit('chat message', 'did you say '+msg+'?');
  // });
  //when disconnected
  socket.on('disconnect', function(){
    console.log('user disconnected');
  });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});
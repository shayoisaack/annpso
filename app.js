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
    res.render('simulate.ejs');
});
app.get('/placewells', function(req, res){
    res.render('placewells.ejs');
});
app.get('/reservoir', function(req, res){
    res.render('reservoir.ejs');
});
app.get('/maps', function(req, res){
    res.render('maps.ejs');
});

//initiate reservoir and pass to client
let simulate = require('./simulator2d-server.js').simulate;
let Res = require('./res2d.js').Res;
const Well = require('./well.js').Well;

const gridblocks = 15;
let res = new Res(gridblocks, gridblocks);
let wells = [new Well(10, 8)];
let timesteps = 10;

//load neural network
const brain = require('brain.js');
const fs = require('fs');
const net = new brain.NeuralNetwork({
    activation: 'leaky-relu', // activation function
    hiddenLayers: [10, 10],
    learningRate: 0.6 // global learning rate, useful when training using streams
});

// //load PSO
// const PSO = require('./psomultiple.js').PSO;
// let pso = new PSO();
const numParticles = 10;
const numIterations = 20;

io.on('connection', function(socket) {
    console.log('connected');

    //when user is connected pass him the reservoir 
    socket.emit('reservoir', clone(res), clone(wells));

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
        // let newRes = new Res(gridblocks, gridblocks);
        // let newWells = [new Well(10, 8)];
        res = simulate(res, wells, timesteps);//[{condition: 'pressure', loc: {x: 7, y: 8}, p_bh: 3350}], 10);
        io.emit('simulate-simulator-final', clone(res), clone(wellsObj));
    });

    socket.on('simulate-ann', function(resObj, wellsObj){
        console.log('ann sim');
        let netJSON = fs.readFileSync('network20x20_97.json', 'utf8');
        net.fromJSON(JSON.parse(netJSON));

        console.log('simulating using ann');
        let newRes = new Res(gridblocks, gridblocks);
        let newWells = [new Well(10, 8)];
        let N_o = net.run(newRes.linearize(newWells, timesteps));
        io.emit('simulate-ann-final', N_o, clone(newRes), clone(newWells));
    });

    socket.on('placewells-ann-pso', function(resObj, numWells){
        console.log(resObj);
        console.log(numWells);
        const PSO = require('./psomultiple.js').PSO;
        let pso = new PSO();
        let netJSON = fs.readFileSync('network.json', 'utf8');
        net.fromJSON(JSON.parse(netJSON));

        pso.init(numParticles, gridblocks, gridblocks, numWells);
        for(let i = 0; i < numIterations; i++){
            pso.step(clone(res), timesteps, function(res, wells, timesteps){
                let val = net.run(res.linearize(wells, timesteps));
                return val[0]*1e10;
            });
        }
        let bestWellPattern = pso.getBestWellPattern();
        io.emit('placewells-ann-pso-result', clone(bestWellPattern));
    });
    //when disconnected
    socket.on('disconnect', function() {
        console.log('disconnected');
    });
});

http.listen(3000, function() {
    console.log('listening on *:3000');
});
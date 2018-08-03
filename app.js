const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const Promise = require('promise');
const clone = require('clone');
const fs = require('fs');
const readFiles = require('./modules/read-files.js').readFiles;

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

app.get('/graphs', function(req, res){
    res.render('graphs.ejs');
});

//initiate reservoir and pass to client
let simulateServer = require('./simulator2d-server.js').simulate;
let simulate = require('./simulator2d.js').simulate;
let Res = require('./res2d.js').Res;
let restoreResMethods = require('./res2d.js').restoreResMethods;
const Well = require('./well.js').Well;

const gridblocksX = 20;
const gridblocksY = 20;
const rate = 200000;
//var res = new Res(gridblocksX, gridblocksY);
var res = JSON.parse(fs.readFileSync('./reservoirs/Hetero 3.json', 'utf8'));
restoreResMethods(res);
let wells = [new Well(4, 13, 'pressure', 3350, rate, rate/10)];//, new Well(12, 9, 'rate', 3350, rate, rate/10), new Well(5, 18, 'rate', 3350, rate, rate/10)];
let timesteps = 1;

var reservoirs = [];

//load neural network
const brain = require('brain.js');
const net = new brain.NeuralNetwork({
    activation: 'leaky-relu', // activation function
    hiddenLayers: [20, 20],
    learningRate: 0.6 // global learning rate, useful when training using streams
});
const netDiv = 1e10;

function normalize(examples){
        min = examples[0].output[0];
        max = examples[0].output[0];
    for (let i = 0; i < examples.length; i++){
        if(examples[i].output[0] > max){
            max = examples[i].output[0];
        }

        if(examples[i].output[0] < min){
            min = examples[i].output[0];
        }
    }
        //normalize input using found min and max
        for (let j = 0; j < examples.length; j++){
            examples[j].output[0] = (examples[j].output[0] - min)/(max - min);
        }
}

// //load PSO
// const PSO = require('./psomultiple.js').PSO;
// let pso = new PSO();
const numParticles = 15;
const numIterations = 3;

io.on('connection', function(socket) {
    console.log('connected');

    reservoirs = [];
    readFiles('reservoirs/', function(filename, content) {
        reservoirs.push(JSON.parse(content));
        //console.log('reservoirs: ', reservoirs);
    }, function(err) {
        throw err;
    });

    //when user is connected pass him the reservoir 
    socket.emit('reservoir', clone(res), clone(wells));

    socket.on('reservoirs-request', function(data){
        io.emit('reservoirs', (reservoirs));
    });

    //receive command to simulate
    socket.on('simulate', function(res, wells) {
        io.emit('simulation-result', simulate(res, wells));
    });

    socket.on('simulate-simulator', function(resObj, wellsObj) {
        restoreResMethods(resObj);
        //console.log('res ', resObj);
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
        res = resObj;
        wells = wellsObj;
        console.log('wells:', wellsObj);
        resObj = simulate(resObj, wellsObj, timesteps);//[{condition: 'pressure', loc: {x: 7, y: 8}, p_bh: 3350}], 10);
        io.emit('simulate-simulator-final', clone(resObj), clone(wellsObj));
    });

    socket.on('simulate-ann', function(resObj, wellsObj){
    	restoreResMethods(resObj);
        let netJSON = fs.readFileSync('network.json', 'utf8');
        net.fromJSON(JSON.parse(netJSON));

        console.log('simulating using ann');
        //let newRes = new Res(gridblocksX, gridblocksY);
        //let newWells = [new Well(10, 8)];
        let N_o = net.run(resObj.linearize(wellsObj, timesteps)) * netDiv / 1000;
        console.log('N_o result:', N_o);
        io.emit('simulate-ann-final', N_o, clone(wellsObj), (JSON.parse(JSON.stringify(res))));
    });

    socket.on('placewells-ann-pso', function(resObj, numWells){
        console.log(resObj);
        console.log(numWells);
        const PSO = require('./psomultiple.js').PSO;
        let pso = new PSO();
        let netJSON = fs.readFileSync('network.json', 'utf8');
        net.fromJSON(JSON.parse(netJSON));

        pso.init(numParticles, gridblocksX, gridblocksY, numWells);
        for(let i = 0; i < numIterations; i++){
            pso.step(clone(res), timesteps, function(res, wells, timesteps){
                let val = net.run(res.linearize(wells, timesteps));
                return val[0]*1e10;
            });
        }
        let bestWellPattern = pso.getBestWellPattern();
        io.emit('placewells-ann-pso-result', clone(bestWellPattern));
    });

    socket.on('placewells-sim-pso', function(resObj, numWells){
        restoreResMethods(resObj);
        console.log('reservoir', resObj);
        const PSO = require('./psomultiple.js').PSO;
        let pso = new PSO();

        pso.init(numParticles, resObj.rows, resObj.cols, numWells);

        for(let i = 0; i < numIterations; i++){
            pso.step(clone(resObj), timesteps, function(res, wells, timesteps){
                let val = simulateServer(clone(res), wells, timesteps);
                console.log('val', val);
                return val;
            });
        }
        let bestWellPattern = pso.getBestWellPattern();
        console.log('best wells:', bestWellPattern);
        io.emit('placewells-ann-pso-result', clone(bestWellPattern));
    });

    socket.on('placewells-ann', function(resObj, numWells){

    });

    socket.on('placewells-sim-brute-force', function(resObj, numWells){
    	restoreResMethods(resObj);
        let netJSON = fs.readFileSync('network.json', 'utf8');
        net.fromJSON(JSON.parse(netJSON));

        let startDate = new Date();
        let Nbest = 0;
        let wellsBest = [];
        for(let i1 = 0; i1 < resObj.rows; i1++){
            for(let j1 = 0; j1 < resObj.cols; j1++){
                // for(let i2 = 0; i2 < resObj.rows; i2++){
                //     for(let j2 = 0; j2 < resObj.cols; j2++){
                        // for(let i3 = 0; i3 < resObj.rows; i3++){
                        //     for(let j3 = 0; j3 < resObj.cols; j3++){
                                //if((i1 === i2 && j1 === j2)) continue;// || (i1 === i3 && j1 === j3) || (i2 === i3 && j2 === j3) || (i1 === i2 === i3 && j1 === j2 === j3)) continue;

                                let wells = [new Well(i1, j1, 'pressure', 3350, 200000, 20000)];//, new Well(i2, j2, 'pressure', 3350, 200000, 20000)]//, new Well(i3, j3, 'pressure', 3350, 200000, 20000)];
                                let N = net.run(resObj.linearize(wells, timesteps));//*netDiv;
    							N = N*(max - min)+min;
                                console.log('testing: ('+i1+','+j1+') : ', N);//, ('+i2+','+j2+')');//, ('+i3+','+j3+')' );
                                if(N > Nbest){
                                    Nbest = N;
                                    wellsBest = wells;
                                }
                            }
                     //   }
                   // }
              //  }
            //}
        }
        let endDate = new Date();
        let timeTaken = (endDate.getTime() - startDate.getTime())/1000/60;
        console.log('time taken:', timeTaken, 'minutes');
        console.log("Nbest: ", Nbest);
        console.log('wellsBest: ', wellsBest);
    });

    socket.on('draw-map-simulator', function(resObj, i, j){
        let N_o = simulateServer(clone(res), [new Well(i, j)], timesteps);
        //let N_o = newRes.N_o;
        io.emit('draw-map-simulator-result', N_o, i, j);
    });

    socket.on('draw-map-ann', function(resObj, i, j){
        let netJSON = fs.readFileSync('network.json', 'utf8');
        net.fromJSON(JSON.parse(netJSON));
        let N_o = net.run(res.linearize([new Well(i, j)], timesteps));
        console.log(N_o);
        io.emit('draw-map-ann-result', N_o, i, j);
    });

    socket.on('reservoir-make', function(resDetails){
        console.log(resDetails);
        let newRes = new Res(Number(resDetails.rows), Number(resDetails.cols));
        newRes.name = resDetails.name;
        newRes.funct = function(){
            return 45;
        };
        //let res1 = JSON.parse(JSON.stringify(newRes));
        //console.log('kro', res1.kro(2, 3));
        //console.log('kro: ', newRes.kro(2, 3));
        io.emit('reservoir-make-result', clone(newRes));
    });

    socket.on('reservoir-save', function(newRes){
        restoreResMethods(newRes);
        res = clone(newRes);
        console.log('res', res);
        fs.writeFileSync('./reservoirs/'+newRes.name+'.json', JSON.stringify(newRes));
        io.emit('reservoir-save-done');
    });
    //when disconnected
    socket.on('disconnect', function() {
        console.log('disconnected');
    });
});

http.listen(4000, function() {
    console.log('listening on *:3000');
});
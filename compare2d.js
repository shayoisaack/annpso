var brain = require('brain.js');
var net = new brain.NeuralNetwork({
    activation: 'leaky-relu', // activation function
    hiddenLayers: [10, 10],
    learningRate: 0.6 // global learning rate, useful when training using streams
});
var Res = require('./res2d.js').Res;
var simulate = require('./simulator2d-server.js').simulate;

var examples = [];

var timesteps = 2;
var gridblocks = 50;
var res = new Res(gridblocks, gridblocks);

//generate examples for use in neural network
for (var i = 0; i < 40; i++) {
    var res = new Res(gridblocks, gridblocks);
    var randNum;
    var wells = [{ loc: { x: randNumX = Math.floor(Math.random() * gridblocks), y: randNumY = Math.floor(Math.random() * gridblocks) }, p_bh: 3350 }];
    examples[i] = {};
    examples[i].input = linearize(res, wells, timesteps);
    examples[i].output = [simulate(res, [{ loc: { x: randNumX, y: randNumY }, p_bh: 3350 }], timesteps)];
}

//train and test neural network on examples
net.train(examples, {
    errorThresh: 0.005, // error threshold to reach
    iterations: 20000, // maximum training iterations
    log: false, // number of iterations between logging
    learningRate: 0.3 // learning rate
});

var res1 = new Res(gridblocks, gridblocks);
var wells1 = [{ loc: { x: 10, y: 5 }, p_bh: 3350 }];
var nnVal, simVal;
var startDate = new Date();
console.log('simulator ', simVal = simulate(res1, wells, timesteps));
var endDate = new Date();
var simTime = (endDate.getTime() - startDate.getTime())/1000;
startDate = new Date();
console.log('neural network ', nnVal = net.run(linearize(res1, wells1, timesteps)));
endDate = new Date();
var annTime = (endDate.getTime() - startDate.getTime())/1000;
console.log('correlation ', 100 - Math.abs((simVal - nnVal)) / simVal * 100, '%');
console.log('\n');
console.log('simulator time ', simTime,'s');
console.log('neural network time ', annTime, 's');
console.log('improvement ', simTime/annTime);

//linearize res properties from each cell for input to neural net
function linearize(res, wells, time) {
    var arr = [];
    for (var i = 0; i < res.cell.length; i++) {
        for (var j = 0; j < res.cell[0].length; j++) {
            // arr[arr.length] = res.cell[i].p;
            // arr[arr.length] = res.cell[i].poro;
            // arr[arr.length] = res.cell[i].kx;
            // arr[arr.length] = res.cell[i].ky;
            // arr[arr.length] = res.cell[i].kz;
            // arr[arr.length] = res.cell[i].qo_;
            // arr[arr.length] = res.cell[i].qw_;
            // arr[arr.length] = res.cell[i].dx;
            // arr[arr.length] = res.cell[i].dy;
            // arr[arr.length] = res.cell[i].dz;
            // arr[arr.length] = res.cell[i].Sw;
            // arr[arr.length] = res.cell[i].So;
            var pp = res.cell[i][j].p * res.cell[i][j].poro * res.cell[i][j].So;
            arr.push(pp);
        }
    }

    for (var i = 0; i < wells.length; i++) {
        arr[arr.length] = wells[i].loc.x;
        arr[arr.length] = wells[i].loc.y;
        arr[arr.length] = wells[i].p_bh;
    }

    arr[arr.length] = time;
    return arr;
}
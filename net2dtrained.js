var brain = require('brain.js');
var fs = require('fs');
var net = new brain.NeuralNetwork({
    activation: 'leaky-relu', // activation function
    hiddenLayers: [10, 10],
    learningRate: 0.6 // global learning rate, useful when training using streams
});
var Res = require('./res2d.js').Res;
var simulate = require('./simulator2dtrain.js').simulate;

var examples = [];

var timesteps = 10;
var gridblocks = 15;
var res = new Res(gridblocks, gridblocks);

//load trained network
var obj = JSON.parse(fs.readFileSync('network.json', 'utf8'));
net.fromJSON((obj));

var res1 = new Res(gridblocks, gridblocks);
var wells1 = [{ loc: { x: 7, y: 8 }, p_bh: 3350 }];
var nnVal, simVal;
var simTime, annTime;
var startDate,  endDate;
startDate = new Date();
simVal = simulate(res1, wells1, timesteps);
endDate = new Date();
simTime = (endDate.getTime()-startDate.getTime())/1000;
console.log('simulator: ', simVal, 'in', simTime, 's');
startDate = new Date();
nnVal = net.run(res1.linearize(wells1, timesteps));
endDate = new Date();
annTime = (endDate.getTime()-startDate.getTime())/1000;
console.log('neural network: ', nnVal[0], 'in', annTime, 's');
console.log('correlation: ', 100 - Math.abs((simVal - nnVal)) / simVal * 100, '%');
console.log('time improvement: ', simTime/annTime, 'times faster');
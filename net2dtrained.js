const brain = require('brain.js');
const fs = require('fs');
const net = new brain.NeuralNetwork({
    activation: 'leaky-relu', // activation function
    hiddenLayers: [10, 10],
    learningRate: 0.6 // global learning rate, useful when training using streams
});
let Res = require('./res2d.js').Res;
let simulate = require('./simulator2dtrain.js').simulate;

let examples = [];

let timesteps = 10;
let gridblocks = 15;
let res = new Res(gridblocks, gridblocks);

//load trained network
let obj = JSON.parse(fs.readFileSync('network.json', 'utf8'));
net.fromJSON((obj));

let res1 = new Res(gridblocks, gridblocks);
let wells1 = [{ condition: 'pressure', loc: { x: 7, y: 8 }, p_bh: 3350, qo_: 200000, qw_: 20000 }];
let nnVal, simVal;
let simTime, annTime;
let startDate,  endDate;
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
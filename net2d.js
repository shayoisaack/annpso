var brain = require('brain.js');
var net = new brain.NeuralNetwork({
    activation: 'leaky-relu', // activation function
    hiddenLayers: [20, 20],
    learningRate: 0.6 // global learning rate, useful when training using streams
});
var Res = require('./res2d.js').Res;
var simulate = require('./simulator2dtrain.js').simulate;

var examples = [];

var timesteps = 10;
var gridblocks = 15;
var res = new Res(gridblocks, gridblocks);

//generate examples for use in neural network
for (var i = 0; i < 10; i++) {
    var res = new Res(gridblocks, gridblocks);
    var randNum;
    var wells = [{ loc: { x: randNumX = Math.floor(Math.random() * gridblocks), y: randNumY = Math.floor(Math.random() * gridblocks) }, p_bh: 3350 }];
    examples[i] = {};
    examples[i].input = res.linearize(wells, timesteps);
    examples[i].output = [simulate(res, [{ loc: { x: randNumX, y: randNumY }, p_bh: 3350 }], timesteps)];
}
console.log('done examples');
examples.forEach(function(elem){
 console.log(elem.input);
})
//train and test neural network on examples
net.train(examples, {
    errorThresh: 0.005, // error threshold to reach
    iterations: 20000, // maximum training iterations
    log: true, // number of iterations between logging
    learningRate: 0.3 // learning rate
});
console.log('done training');

var fs = require('fs');
fs.writeFile('network.json', JSON.stringify(net.toJSON()), function(err){
    if(err) console.log(err);
    console.log('trained network saved');
});

var res1 = new Res(gridblocks, gridblocks);
var wells1 = [{ loc: { x: 10, y: 5 }, p_bh: 3350 }];
var nnVal, simVal;
console.log('simulator ', simVal = simulate(res1, wells1, timesteps));
console.log('neural network ', nnVal = net.run(res1.linearize(wells1, timesteps)));
console.log('correlation ', 100 - Math.abs((simVal - nnVal)) / simVal * 100, '%');
const brain = require('brain.js');
const net = new brain.NeuralNetwork({
    activation: 'leaky-relu', // activation function
    hiddenLayers: [20, 20],
    learningRate: 0.6 // global learning rate, useful when training using streams
});
const Res = require('./res2d.js').Res;
const Well = require('./well.js').Well;
const simulate = require('./simulator2dtrain.js').simulate;

let examples = [];

let timesteps = 10;
let gridblocks = 7;
let res = new Res(gridblocks, gridblocks);
//generate examples for use in neural network
for (let i = 0; i < 10; i++) {
    res = new Res(gridblocks, gridblocks);
    let randNumX, randNumY;
    let wells = [new Well(randNumX = Math.floor(Math.random() * gridblocks), randNumY = Math.floor(Math.random() * gridblocks))];
    for(let t = 0; t < 200; t+= timesteps) {
        let N_o = simulate(res, wells, timesteps);
        console.log('simulator result:', N_o);
        examples.push({input: res.linearize(wells, timesteps),
        output: [N_o]});//[simulate(res, wells, timesteps)]});
    }
}
console.log('done examples');
// examples.forEach(function(elem){
//  //console.log(elem.input);
// })
//train and test neural network on examples
net.train(examples, {
    errorThresh: 0.005, // error threshold to reach
    //iterations: 20000, // maximum training iterations
    log: true, // number of iterations between logging
    learningRate: 0.3 // learning rate
});
console.log('done training');

const fs = require('fs');
fs.writeFile('network.json', JSON.stringify(net.toJSON()), function(err){
    if(err) console.log(err);
    console.log('trained network saved');
});

let res1 = new Res(gridblocks, gridblocks);
let wells1 = [{ condition: 'pressure', loc: { x: 4, y: 5 }, p_bh: 3350 }];
let nnVal, simVal;
console.log('simulator ', simVal = simulate(res1, wells1, timesteps));
console.log('neural network ', nnVal = net.run(res1.linearize(wells1, timesteps)));
console.log('correlation ', 100 - Math.abs((simVal - nnVal)) / simVal * 100, '%');
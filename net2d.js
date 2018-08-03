const brain = require('brain.js');
const net = new brain.NeuralNetwork({
    activation: 'sigmoid', // activation function
    hiddenLayers: [20, 20],
    learningRate: 0.6 // global learning rate, useful when training using streams
});
const Res = require('./res2d.js').Res;
const Well = require('./well.js').Well;
const simulate = require('./simulator2d-server.js').simulate;
const sim1 = require('./simulator2d-server').simulate;
const fs = require('fs');
const clone = require('clone');
const restoreResMethods = require('./res2d.js').restoreResMethods;

let examples = [];

const timesteps = 1;
const gridblocks = 20;
const numWells = 1;
const netDiv = 1e10;
const readExamplesFromFile = false;

let reservoir = fs.readFileSync('reservoirs/Hetero 3.json', 'utf8');
reservoir = JSON.parse(reservoir);
restoreResMethods(reservoir);

if(readExamplesFromFile){
    let examplesJSON = fs.readFileSync('examples.json', 'utf8');
    examples = JSON.parse(examplesJSON);
}
else {
    //let res = new Res(gridblocks, gridblocks);
    //generate examples for use in neural network
    for (let i = 0; i < 30; i++) {
        //res = new Res(gridblocks, gridblocks);
        let res = clone(reservoir);
        let randNumX, randNumY;
        let wells = [];
        for (let j = 0; j < numWells; j++) {
            wells[j] = new Well(randNumX = Math.floor(Math.random() * gridblocks), randNumY = Math.floor(Math.random() * gridblocks));
        }
        //console.log(wells);
        //for(let t = 0; t < 200; t+= timesteps) {
        let N_o = simulate(res, wells, timesteps);
        console.log('simulator result:', N_o);
        examples.push({
            input: res.linearize(wells, timesteps),
            output: [N_o]
        });//[simulate(res, wells, timesteps)]});
        //}
    }
    //console.log(examples);
    var max, min;
    normalize(examples);
    console.log('done examples');
    //save examples to file
    fs.writeFile('examples.json', JSON.stringify(examples), function(err){
        if(err) console.log(err);
        console.log('examples saved');
    });
}
// examples.forEach(function(elem){
//  //console.log(elem.input);
// })

//standardize input before feeding to neural network
//examples = standardize(examples);
//train and test neural network on examples
net.train(examples, {
    errorThresh: 0.005, // error threshold to reach
    iterations: 20000, // maximum training iterations
    log: true, // number of iterations between logging
    learningRate: 0.3 // learning rate
});
console.log('done training');

fs.writeFile('network.json', JSON.stringify(net.toJSON()), function(err){
    if(err) console.log(err);
    console.log('trained network saved');
});

let sum = 0;
let testCases = 15;
let simSumTIme = 0;
let netSumTime = 0;
for(let i = 0; i < testCases; i++) {
    let randNumX, randNumY;
    let corr = 0;
    let wells = [];
    for(let j = 0; j < numWells; j++) {
        wells[j] = new Well(randNumX = Math.floor(Math.random() * gridblocks), randNumY = Math.floor(Math.random() * gridblocks));
    }
    let res1 = clone(reservoir);
    //let res1 = new Res(gridblocks, gridblocks);
    //let wells1 = [{condition: 'pressure', loc: {x: 4, y: 5}, p_bh: 3350}];
    let nnVal, simVal, simStartTime, simEndTime, netStartTime, netEndtime, simTime, netTime;
    simStartTime = new Date();
    console.log('simulator ', simVal = simulate(res1, wells, timesteps));
    simEndTime = new Date();
    simTime = (simEndTime.getTime()-simStartTime.getTime())/1000;

    netStartTime = new Date();
    nnVal = net.run(res1.linearize(wells, timesteps));
    nnVal = nnVal*(max - min)+min;
    console.log('neural network ', nnVal);// * netDiv);
    netEndtime = new Date();
    netTime = (netEndtime.getTime()-netStartTime.getTime())/1000;

    console.log('correlation ', corr = 100 - Math.abs((simVal - nnVal)) / simVal * 100, '%');
    sum += corr;
    simSumTIme += simTime;
    netSumTime += netTime;
}

console.log('\n');
console.log('average correlation ', sum/testCases, '%');
console.log('average simulator time ', simSumTIme/testCases, 's');
console.log('average neural network time ', netSumTime/testCases, 's');
console.log('computational improvement ', simSumTIme/netSumTime, 'times faster');
//
// let resul1 = sim1(new Res(15, 15), [new Well(10, 8)], 10);
// console.log('sim ', simulate(new Res(15, 15), [new Well(10, 8)], 10));
// console.log('sim1 ', resul1.N_o);

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
    console.log('min', min);
    console.log('max', max);
        //normalize input using found min and max
        for (let j = 0; j < examples.length; j++){
            examples[j].output[0] = (examples[j].output[0] - min)/(max - min);
        }
}
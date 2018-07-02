const brain = require('brain.js');
const net = new brain.NeuralNetwork({
    activation: 'sigmoid', // activation function
    hiddenLayers: [20, 20],
    learningRate: 0.6 // global learning rate, useful when training using streams
});
const Res = require('./res2d.js').Res;
const Well = require('./well.js').Well;
const simulate = require('./simulator2dtrain.js').simulate;
const sim1 = require('./simulator2d-server').simulate;
const fs = require('fs');

let examples = [];

const timesteps = 10;
const gridblocks = 15;
const numWells = 1;
const netDiv = 1e10;
const readExamplesFromFile = false;

if(readExamplesFromFile){
    let examplesJSON = fs.readFileSync('examples.json', 'utf8');
    examples = JSON.parse(examplesJSON);
}
else {
    let res = new Res(gridblocks, gridblocks);
    //generate examples for use in neural network
    for (let i = 0; i < 30; i++) {
        res = new Res(gridblocks, gridblocks);
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
            output: [N_o / netDiv]
        });//[simulate(res, wells, timesteps)]});
        //}
    }
    //console.log(examples);
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
    //iterations: 20000, // maximum training iterations
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
    let res1 = new Res(gridblocks, gridblocks);
    //let wells1 = [{condition: 'pressure', loc: {x: 4, y: 5}, p_bh: 3350}];
    let nnVal, simVal, simStartTime, simEndTime, netStartTime, netEndtime, simTime, netTime;
    simStartTime = new Date();
    console.log('simulator ', simVal = simulate(res1, wells, timesteps));
    simEndTime = new Date();
    simTime = (simEndTime.getTime()-simStartTime.getTime())/1000;

    netStartTime = new Date();
    console.log('neural network ', nnVal = net.run(res1.linearize(wells, timesteps)) * netDiv);
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

function standardize(examples){
    for (let i = 0; i < examples[0].input.length; i++){
        let min = examples[0].input[i];
        let max = examples[0].input[i];
        //find min and max for input neuron
        for (let j = 0; j < examples.length; j++){
            if(examples[j].input[i] > max){
                max = examples[j].input[i];
            }
            if(examples[j].input[i] < min){
                min = examples[j].input[i];
            }
        }
        //standardize input using found min and max
        for (let j = 0; j < examples.length; j++){
            examples[j].input[i] = (examples[j].input[i] - min)/(max - min);
        }
    }
    return examples;
}
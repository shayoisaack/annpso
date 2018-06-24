const brain = require('brain.js');
const PSO = require('./pso.js').PSO;
const fs = require('fs');
const net = new brain.NeuralNetwork({
    activation: 'leaky-relu', // activation function
    hiddenLayers: [10, 10],
    learningRate: 0.6 // global learning rate, useful when training using streams
});
const Res = require('./res2d.js').Res;
const Well = require('./well.js').Well;
const simulate = require('./simulator2dtrain.js').simulate;

const timesteps = 1;
const gridblocks = 15;
//let res = new Res(gridblocks, gridblocks);

let netJSON = fs.readFileSync('network15x15_97.json', 'utf8');
net.fromJSON(JSON.parse(netJSON));

console.log('net', net.run(new Res(gridblocks, gridblocks).linearize([{loc: {x: 2, y: 3}}])));

let pso = new PSO();
const numParticles = 10;
const numIterations = 20;

//pso.setObjective(simulate, res, timesteps);

pso.init(numParticles, gridblocks, gridblocks);
for(let i = 0; i < 40; i++){
    pso.step(new Res(gridblocks, gridblocks), timesteps, function(res, wells, timesteps){
        return net.run(res.linearize(wells, timesteps));
    });
}

console.log('pBest', pso.gBest);
console.log('gBestVal', pso.gBestVal);
// pso.printParticles();
// pso.step(new Res(gridblocks, gridblocks), timesteps, simulate);
// pso.printParticles();
// console.log('gBest', pso.gBest);
// console.log('gBestVal', pso.gBestVal);
// console.log('\n');
// pso.printParticles();
// pso.step(new Res(gridblocks, gridblocks), timesteps, simulate);
// pso.printParticles();
// console.log('gBest', pso.gBest);
// console.log('gBestVal', pso.gBestVal);

//pso.printParticles();
//pso.step(numIterations);

//console.log('annpso: ', pso.bestFitness, pso.bestPosition);

// //search for best location using pso
// let optimizer = new pso.Optimizer();
// optimizer.setObjectiveFunction(function(x) {
//     let res2 = new Res(gridblocks);
//     return net.run(linearize(res2, timesteps, [{ loc: x[0], p_bh: 3350 }]));
// });
//
// optimizer.init(20, [{ start: 1, end: 100 }]);
//
// for (let i = 0; i < 40; i++) {
//     optimizer.step();
// }
// console.log('pso: ', optimizer.getBestFitness(), optimizer.getBestPosition());
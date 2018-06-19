//var brain1 = require('./brain/lib/brain.js');
var brain = require('brain.js');
var net = new brain.NeuralNetwork({
  activation: 'leaky-relu', // activation function
  hiddenLayers: [10, 10],
  learningRate: 0.6 // global learning rate, useful when training using streams
});
var Res = require('./res.js').Res;
var simulate = require('./simulator.js').simulate;

var examples = [];

var timesteps = 2;
var gridblocks = 100;
var res = new Res(gridblocks);
//generate examples for use in neural network
for(var i = 0; i < 70; i++){
	var res = new Res(gridblocks);
	var randNum;
	var wells = [{loc: randNum = Math.floor(Math.random()*gridblocks), p_bh: 3350}];
	//if(randNum == 18) console.log('rand ', randNum);
	//res.addWells(wells);
	examples[i] = {};
	examples[i].input = linearize(res, timesteps, wells);
	examples[i].output = [simulate(res, timesteps, [{loc: randNum, p_bh: 3350}])];
}

//console.log(examples);
//train and test neural network on examples
net.train(examples, {
  errorThresh: 0.005,  // error threshold to reach
  iterations: 20000,   // maximum training iterations
  log: false,            // number of iterations between logging
  learningRate: 0.3    // learning rate
});
//console.log(brain);
//brain.test({input: examples.input, output: examples.output});
var res1 = new Res(gridblocks);
var wells1 = [{loc: 1, p_bh: 3350}];
//res1.addWells(wells1)
var nnVal, simVal;
console.log('simulator ', simVal = simulate(res1, timesteps, wells1));
console.log('neural network ', nnVal = net.run(linearize(res1, timesteps, wells1)));
console.log('correlation ', 100 - Math.abs((simVal - nnVal))/simVal*100, '%');
//console.log(brain);

function linearize(res, time, wells){
	//linearize res properties from each cell for input to neural net
	var arr = [];
	for(var i = 0; i < res.cell.length; i++){
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
		var pp = res.cell[i].p*res.cell[i].poro*res.cell[i].So;
		arr[i] = pp;
	}

	for(var i = 0; i < wells.length; i++){
		arr[arr.length] = wells[i].loc;
		arr[arr.length] = wells[i].p_bh;
	}

	arr[arr.length] = time;
	return arr;
}
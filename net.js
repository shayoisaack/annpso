//var brain1 = require('./brain/lib/brain.js');
var brain1 = require('brain.js');
var brain = new brain1.NeuralNetwork({
  activation: 'leaky-relu', // activation function
  hiddenLayers: [10, 10],
  learningRate: 0.6 // global learning rate, useful when training using streams
});
var Res = require('./res.js').Res;
var simulate = require('./simulator.js').simulate;

var res = new Res(20);

var examples = [];

//simulate(res, 2, [{loc: 5, p_bh: 1500}]);

var timesteps = 3;
//generate examples for use in neural network
for(var i = 0; i < 20; i++){
	var res = new Res(20);
	var wells = [{loc: i, p_bh: 1500}];
	//res.addWells(wells);
	examples[i] = {};
	examples[i].input = linearize(res, timesteps, wells);
	examples[i].output = [simulate(res, timesteps, [{loc: i, p_bh: 1500}])];
}

//console.log(examples);
//train and test neural network on examples
brain.train(examples, {
  errorThresh: 0.005,  // error threshold to reach
  iterations: 20000,   // maximum training iterations
  log: false,            // number of iterations between logging
  learningRate: 0.3    // learning rate
});
//console.log(brain);
//brain.test({input: examples.input, output: examples.output});
var res1 = new Res(20);
var wells1 = [{loc: 18, p_bh: 1500}];
//res1.addWells(wells1)
console.log('neural network ', brain.run(linearize(res1, timesteps, wells1)));
console.log('simulator ', simulate(res1, timesteps, wells1));

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
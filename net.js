var brain1 = require('./brain/lib/brain.js');
var brain = new brain1.NeuralNetwork();
var Res = require('./res.js').Res;
var simulate = require('./simulator.js').simulate;

var res = new Res(20);

var examples = {
	input: [],
	output: []
}

//simulate(res, 2, [{loc: 5, p_bh: 1500}]);

//generate examples for use in neural network
for(var i = 0; i < 20; i++){
	var wells = [{loc: i, p_bh: 1500}];
	examples.input[i] = linearize(res);
	examples.output[i] = simulate(res, 2, wells);
}

//train and test neural network on examples
brain.train({input: examples.input, output: examples.output});
//brain.test({input: examples.input, output: examples.output});

console.log(brain);

function linearize(res){
	//linearize res properties from each cell for input to neural net
	var arr = [];
	for(var i = 0; i < res.cell.length; i++){
		arr[arr.length] = res.cell[i].poro;
		arr[arr.length] = res.cell[i].p;
		arr[arr.length] = res.cell[i].poro;
		arr[arr.length] = res.cell[i].perm;
		arr[arr.length] = res.cell[i].perm;
		arr[arr.length] = res.cell[i].kx;
		arr[arr.length] = res.cell[i].qo_;
		arr[arr.length] = res.cell[i].qw_;
		arr[arr.length] = res.cell[i].dx;
		arr[arr.length] = res.cell[i].dy;
		arr[arr.length] = res.cell[i].dz;
		arr[arr.length] = res.cell[i].Sw;
		arr[arr.length] = res.cell[i].So;
	}
}
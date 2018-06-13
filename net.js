var brain = require('./brain/lib/brain.js');

var examples = {
	inputs: [],
	outputs: []
}

//generate examples for use in neural network
for(var i = 0; i < 20; i++){
	var wells = [{loc: i, p_bh: 1500}];
	examples.input[i] = linearize(res);
	examples.output[i] = linearize(simulate(res, 2, wells));
}

//train and test neural network on examples
brain.train(input: examples.input.slice(0, 14), output: examples.output.slice(0,14));
brain.test(input: examples.input.slice(15, 20), output: examples.output.slice(15, 20));

function linearize(res){
	//linearize res properties from each cell for input to neural net

}

console.log(brain);
var brain = require('brain.js');
var fs = require('fs');
var net = new brain.NeuralNetwork({
    activation: 'leaky-relu', // activation function
    hiddenLayers: [10, 10],
    learningRate: 0.6 // global learning rate, useful when training using streams
});
var Res = require('./res2d.js').Res;
var simulate = require('./simulator2dtrain.js').simulate;

var examples = [];

var timesteps = 10;
var gridblocks = 15;
var res = new Res(gridblocks, gridblocks);

//load trained network
var obj = JSON.parse(fs.readFileSync('network.json', 'utf8'));
net.fromJSON((obj));

var res1 = new Res(gridblocks, gridblocks);
var wells1 = [{ loc: { x: 0, y: 0 }, p_bh: 3350 }];
var nnVal, simVal;
console.log('simulator ', simVal = simulate(res1, wells1, timesteps));
console.log('neural network ', nnVal = net.run(linearize(res1, wells1, timesteps)));
console.log('correlation ', 100 - Math.abs((simVal - nnVal)) / simVal * 100, '%');

//linearize res properties from each cell for input to neural net
function linearize(res, wells, time) {
    var arr = [];
    for (var i = 0; i < res.cell.length; i++) {
        for (var j = 0; j < res.cell[0].length; j++) {
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
            var pp = res.cell[i][j].p * res.cell[i][j].poro * res.cell[i][j].So;
            arr.push(pp);
        }
    }

    for (var i = 0; i < wells.length; i++) {
        arr[arr.length] = wells[i].loc.x;
        arr[arr.length] = wells[i].loc.y;
        arr[arr.length] = wells[i].p_bh;
    }

    arr[arr.length] = time;
    return arr;
}
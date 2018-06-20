var simulate = require('./simulator2d.js').simulate;
var Res = require('./res2d.js').Res;

var res = new Res(10, 10);
//console.log(JSON.stringify(res));

console.log('simulator: ', simulate(res, 1, [{loc:{x: 1, y: 1}, p_bh: 3350}]));
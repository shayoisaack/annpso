var simulate = require('./simulator2d.js').simulate;
var Res = require('./res2d.js').Res;

var res = new Res(5, 1);
//console.log(JSON.stringify(res));

console.log(simulate(res, 1, [{loc:{x: 2, y: 3}, p_bh: 3350}]));
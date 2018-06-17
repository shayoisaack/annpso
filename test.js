var simulate = require('./simulator2d.js').simulate;
var Res = require('./res2d.js').Res;

var res = new Res(20, 20);
//console.log(JSON.stringify(res));

console.log(simulate(res, 2, [{loc:{x: 5, y: 10}, p_bh: 3350}]));
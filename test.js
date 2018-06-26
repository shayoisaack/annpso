// var simulate = require('./simulator2d-server.js').simulate;
// var Res = require('./res2d.js').Res;
// var exists = require('./utilities.js').exists;
// var zeros = require('./utilities.js').zeros;
// //var res = new Res(5, 3);
// //console.log(JSON.stringify(res));
// var res = new Res(3, 3);
//
// var A = zeros(res.cols * res.rows, res.cols * res.rows);
// var a = [];
// //generate coefficient matrix A
// for (var i = 0; i < res.rows; i++) {
//     for (var j = 0; j < res.cols; j++) {
//     	//calculate a,b,c,d,e,f for cell
//         var cellIndex = res.cell[i][j].index;
//         if (exists(A, cellIndex, cellIndex)) {
//             A[cellIndex][cellIndex] = 'b'+cellIndex;
//         }
//         if (exists(A, cellIndex, cellIndex+1) && exists(res.cell, i, j+1)){
//         	A[cellIndex][cellIndex+1] = 'c'+cellIndex;
//         }
//         if (exists(A, cellIndex, cellIndex-1) && exists(res.cell, i, j-1)){
//         	A[cellIndex][cellIndex-1] = 'a'+cellIndex;
//         }
//         if (exists(A, cellIndex, cellIndex+res.cols)){
//         	A[cellIndex][cellIndex+res.cols] = 'f'+cellIndex;
//         }
//         if (exists(A, cellIndex, cellIndex-res.cols)){
//         	A[cellIndex][cellIndex-res.cols] = 'e'+cellIndex;
//         }
//     }
// }
// //console.log(A); //a.length);
// var T = 0;
// //console.log(T*234/fn());
// //console.log(res.p_cow(2, 4))
// console.log('simulator: ', simulate(res, [{loc:{x: 1, y:1}, p_bh:3500, qo_: 200, qw_: 20}], 50));
// function fn(){
// 	return -1;
// }

let arr = Array(5).fill(4);
console.log(arr);
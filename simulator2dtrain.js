var extrapolate = require('./utilities.js').extrapolate;
var zeros = require('./utilities.js').zeros;
var exists = require('./utilities.js').exists;
// var Bo = require('./utilities.js').Bo;
// var d1_Bo_dPo = require('./utilities.js').d1_Bo_dPo;
// var Bw = require('./utilities.js').Bw;
// var d1_Bw_dPw = require('./utilities.js').d1_Bw_dPw;
// var dPcow_dSw = require('./utilities.js').dPcow_dSw;
// var visc_o = require('./utilities.js').visc_o;
// var visc_w = require('./utilities.js').visc_w;
// var p_cow = require('./utilities.js').p_cow;
var swof = require('./pvt.js').swof;
var pvt = require('./pvt.js').pvt;
var gauss = require('./gaussian-elimination-master/gauss.js');

//some constants
var dt = 0.1; // timestep is 1 day
var Rs = 0.4;
var Pbp = 3337.0; //psi
var Pref = 14.7;
var cr = 3.0E-6;
var rho = {};
rho.o = 49.1;
rho.w = 64.79;
rho.g = 0.06054;
var Pi = 6000; //initial pressure (psi)

var simulate = function(res, wells, timesteps) {
    //set defaults
    if (timesteps == undefined) timesteps = Infinity;
    if (wells == undefined) wells = [];

    var N_o = 0;
    var N_w = 0;
    //simulate
    for (var timeIndex = 1; timeIndex <= timesteps; timeIndex++) { //number of timesteps to iterate (in days)
        //console.log('/////////////////////////////////////////////////////////////// ', 'day ', timeIndex, '\n');

        //set wells
        var q_ = res.addWells(wells);
        //console.log(q_);
        N_o += q_.qo_;
        N_w += q_.qw_;

        var A = zeros(res.rows * res.cols, res.cols * res.rows);
        var darr = [];

        var Txo_neg = zeros(res.rows, res.cols);
        var Txo_pos = zeros(res.rows, res.cols);
        var Txw_neg = zeros(res.rows, res.cols);
        var Txw_pos = zeros(res.rows, res.cols);
        var Tyo_pos = zeros(res.rows, res.cols);
        var Tyo_neg = zeros(res.rows, res.cols);
        var Tyw_pos = zeros(res.rows, res.cols);
        var Tyw_neg = zeros(res.rows, res.cols);
        var Csww = zeros(res.rows, res.cols);
        var Cswo = zeros(res.rows, res.cols);
        var Cpoo = zeros(res.rows, res.cols);
        var Cpow = zeros(res.rows, res.cols);

        for (var i = 0; i < res.cell.length; i++) { //iterate on each gridblock
            for (var j = 0; j < res.cell[0].length; j++) {
                var a, b, c, d;
                var alpha;
                Cpoo[i][j] = res.cell[i][j].poro * (1 - res.cell[i][j].Sw) / dt * ((cr / res.Bo(i, j) + res.d1_Bo_dPo(i, j)));
                Cswo[i][j] = -res.cell[i][j].poro / (res.Bo(i, j) * dt);
                Cpow[i][j] = (res.cell[i][j].poro * res.cell[i][j].Sw) / dt * (cr / res.Bw(i, j) + res.d1_Bw_dPw(i, j));
                Csww[i][j] = res.cell[i][j].poro / (res.Bw(i, j) * dt) - res.dPcow_dSw(i, j) * Cpow[i][j];
                console.log('Cpoo: ',Cpoo[i][j], 'Cpow', Cpow[i][j], 'Cswo', Cswo[i][j], 'Csww', Csww[i][j]);

                alpha = -Cswo[i][j] / Csww[i][j];
                //console.log(alpha);

                if (!exists(res.cell, i - 1, j)) {
                    lambda_x_o_neg = 0;
                    lambda_x_w_neg = 0;
                    Txo_neg[i][j] = 0
                    Txw_neg[i][j] = 0
                } else {
                    lambda_x_o_neg = lambda_x_o_neg = (res.cell[i - 1][j].p) >= res.cell[i][j].p ? res.cell[i - 1][j].kx / res.visc_o(i - 1, j) / res.Bo(i - 1, j) : res.cell[i][j].kx / res.visc_o(i, j) / res.Bo(i, j);
                    lambda_x_w_neg = lambda_x_w_neg = (res.cell[i - 1][j].p) >= res.cell[i][j].p ? res.cell[i - 1][j].kx / res.visc_w(i - 1, j) / res.Bw(i - 1, j) : res.cell[i][j].kx / res.visc_w(i, j) / res.Bw(i, j);
                    Txo_neg[i][j] = 2 * lambda_x_o_neg / res.cell[i][j].dx / (res.cell[i - 1][j].dx / res.cell[i - 1][j].kx + res.cell[i][j].dx / res.cell[i][j].kx);
                    Txw_neg[i][j] = 2 * lambda_x_w_neg / res.cell[i][j].dx / (res.cell[i - 1][j].dx / res.cell[i - 1][j].kx + res.cell[i][j].dx / res.cell[i][j].kx);
                }

                if (!exists(res.cell, i + 1, j)) {
                    lambda_x_o_pos = 0;
                    lambda_x_w_pos = 0;
                    Txo_pos[i][j] = 0;
                    Txw_pos[i][j] = 0;
                } else {
                    lambda_x_o_pos = lambda_x_o_pos = (res.cell[i + 1][j].p >= res.cell[i][j].p) ? res.cell[i + 1][j].kx / res.visc_o(i + 1, j) / res.Bo(i + 1, j) : res.cell[i][j].kx / res.visc_o(i, j) / res.Bo(i, j);
                    lambda_x_w_pos = lambda_x_w_pos = (res.cell[i + 1][j].p >= res.cell[i][j].p) ? res.cell[i + 1][j].kx / res.visc_w(i + 1, j) / res.Bw(i + 1, j) : res.cell[i][j].kx / res.visc_w(i, j) / res.Bw(i, j);
                    Txo_pos[i][j] = 2 * lambda_x_o_pos / res.cell[i][j].dx / (res.cell[i + 1][j].dx / res.cell[i + 1][j].kx + res.cell[i][j].dx / res.cell[i][j].kx);
                    Txw_pos[i][j] = 2 * lambda_x_w_pos / res.cell[i][j].dx / (res.cell[i + 1][j].dx / res.cell[i + 1][j].kx + res.cell[i][j].dx / res.cell[i][j].kx);
                }

                if (!exists(res.cell, i, j - 1)) {
                    lambda_y_o_neg = 0;
                    lambda_y_w_neg = 0;
                    Tyo_neg[i][j] = 0;
                    Tyw_neg[i][j] = 0;
                } else {
                    lambda_y_o_neg = lambda_y_o_neg = (res.cell[i][j - 1].p) >= res.cell[i][j].p ? res.cell[i][j - 1].ky / res.visc_o(i, j - 1) / res.Bo(i, j - 1) : res.cell[i][j].ky / res.visc_o(i, j) / res.Bo(i, j);
                    lambda_y_w_neg = lambda_y_w_neg = (res.cell[i][j - 1].p) >= res.cell[i][j].p ? res.cell[i][j - 1].ky / res.visc_w(i, j - 1) / res.Bw(i, j - 1) : res.cell[i][j].ky / res.visc_w(i, j) / res.Bw(i, j);
                    Tyo_neg[i][j] = 2 * lambda_y_o_neg / res.cell[i][j].dy / (res.cell[i][j - 1].dy / res.cell[i][j - 1].ky + res.cell[i][j].dy / res.cell[i][j].ky);
                    Tyw_neg[i][j] = 2 * lambda_y_w_neg / res.cell[i][j].dy / (res.cell[i][j - 1].dy / res.cell[i][j - 1].ky + res.cell[i][j].dy / res.cell[i][j].ky);
                }

                if (!exists(res.cell, i, j + 1)) {
                    lambda_y_o_pos = 0;
                    lambda_y_w_pos = 0;
                    Tyo_pos[i][j] = 0;
                    Tyw_pos[i][j] = 0;
                } else {
                    lambda_y_o_pos = lambda_y_o_pos = (res.cell[i][j + 1].p >= res.cell[i][j].p) ? res.cell[i][j + 1].ky / res.visc_o(i, j + 1) / res.Bo(i, j + 1) : res.cell[i][j].ky / res.visc_o(i, j) / res.Bo(i, j);
                    lambda_y_w_pos = lambda_y_w_pos = (res.cell[i][j + 1].p >= res.cell[i][j].p) ? res.cell[i][j + 1].ky / res.visc_w(i, j + 1) / res.Bw(i, j + 1) : res.cell[i][j].ky / res.visc_w(i, j) / res.Bw(i, j);
                    Tyo_pos[i][j] = 2 * lambda_y_o_pos / res.cell[i][j].dy / (res.cell[i][j + 1].dy / res.cell[i][j + 1].ky + res.cell[i][j].dy / res.cell[i][j].ky);
                    Tyw_pos[i][j] = 2 * lambda_y_w_pos / res.cell[i][j].dy / (res.cell[i][j + 1].dy / res.cell[i][j + 1].ky + res.cell[i][j].dy / res.cell[i][j].ky);
                }

                Txo_neg[i][j] = Txo_neg[i][j] * 0.001127;
                Txo_pos[i][j] = Txo_pos[i][j] * 0.001127;
                Txw_neg[i][j] = Txw_neg[i][j] * 0.001127;
                Txw_pos[i][j] = Txw_pos[i][j] * 0.001127;
                Tyo_neg[i][j] = Tyo_neg[i][j] * 0.001127;
                Tyo_pos[i][j] = Tyo_pos[i][j] * 0.001127;
                Tyw_neg[i][j] = Tyw_neg[i][j] * 0.001127;
                Tyw_pos[i][j] = Tyw_pos[i][j] * 0.001127;

                a = Txo_neg[i][j] + alpha * Txw_neg[i][j];
                c = Txo_pos[i][j] + alpha * Txw_pos[i][j];
                b = -(Txo_pos[i][j] + Txo_neg[i][j] + Tyo_pos[i][j] + Tyo_neg[i][j] + Cpoo[i][j]) - alpha * (Txw_pos[i][j] + Txw_neg[i][j] + Tyw_pos[i][j] + Tyw_neg[i][j] + Cpow[i][j]);
                e = Tyo_neg[i][j] + alpha * Tyw_neg[i][j];
                f = Tyo_pos[i][j] + alpha * Tyw_pos[i][j];
                d = -(Cpoo[i][j] + alpha * Cpow[i][j]) * res.cell[i][j].p + res.cell[i][j].qo_ + alpha * res.cell[i][j].qw_ + alpha * Txw_pos[i][j] * (res.p_cow(i + 1, j) - res.p_cow(i, j)) + alpha * Txw_neg[i][j] * (res.p_cow(i - 1, j) - res.p_cow(i, j)) + alpha * Tyw_pos[i][j] * (res.p_cow(i, j + 1) - res.p_cow(i, j)) + alpha * Tyw_neg[i][j] * (res.p_cow(i, j - 1) - res.p_cow(i, j));

                // a = Math.trunc(a);
                // b = Math.trunc(b);
                // c = Math.trunc(c);
                // d = Math.trunc(d);
                // e = Math.trunc(e);
                // f = Math.trunc(f);
                //console.log(a, b, c, d, e, f);
                //var fs = require('fs');

                darr.push(d);

                var cellIndex = res.cell[i][j].index;
                if (exists(A, cellIndex, cellIndex)) {
                    A[cellIndex][cellIndex] = b;
                }
                if (exists(A, cellIndex, cellIndex + 1) && exists(res.cell, i, j+1)) {
                    A[cellIndex][cellIndex + 1] = c;
                }
                if (exists(A, cellIndex, cellIndex - 1) && exists(res.cell, i, j-1)) {
                    A[cellIndex][cellIndex - 1] = a;
                }
                if (exists(A, cellIndex, cellIndex + res.cols)) {
                    A[cellIndex][cellIndex + res.cols] = f;
                }
                if (exists(A, cellIndex, cellIndex - res.cols)) {
                    A[cellIndex][cellIndex - res.cols] = e;
                }
            }
        }

        //}
        //var row =[];
        var B = [
            []
        ];
        //console.log(res.cell.length, res.cell[0].length);
        // for (var ri = 0; ri < res.cell.length * res.cell[0].length; ri++) {
        //     A[ri] = [];
        //     B[ri] = [];
        //     for (var rj = 0; rj < res.cell.length * res.cell[0].length; rj++) {
        //         //console.log(ri, rj);
        //         if (ri == rj + 1) {
        //             A[ri][rj] = a;
        //             B[ri][rj] = 'a';
        //         } else if (ri == rj) {
        //             A[ri][rj] = b;
        //             B[ri][rj] = 'b';
        //         } else if (ri == rj - 1) {
        //             A[ri][rj] = c;
        //             B[ri][rj] = 'c';
        //         } else if (rj == ri + res.cell[0].length - 1) {
        //             A[ri][rj] = f;
        //             B[ri][rj] = 'f';
        //         } else if (ri == rj + res.cell.length - 1) {
        //             A[ri][rj] = e;
        //             B[ri][rj] = 'e';
        //         } else {
        //             A[ri][rj] = 0;
        //             B[ri][rj] = 0;
        //         }
        //     }
        //     // fs.appendFileSync("/tmp/test", A[ri] + '\n');
        // }
        // fs.appendFileSync("/tmp/test", '\n');
        // fs.appendFileSync("/tmp/test", darr);

        //console.log('A = ', B, '\n');
        //console.log('d = ', darr, '\n');
        P_new = gauss(A, darr);
        var Pnew = arrayToMatrix(P_new, res.cell[0].length);
        //console.log('P_new = ', Pnew, '\n');

        //stop solving if any of the pressures is less than bottom hole
        for (var wellIndex = 0; wellIndex < wells.length; wellIndex++) {
            if (Pnew[wells[wellIndex].loc.x][wells[wellIndex].loc.y] < wells[wellIndex].p_bh) {
                //console.log('stop simulation: p < p_bh, timestep: ', timeIndex);
                return returnModule();
            }
        }

        function arrayToMatrix(list, elementsPerSubArray) {
            var matrix = [],
                i, k;

            for (i = 0, k = -1; i < list.length; i++) {
                if (i % elementsPerSubArray === 0) {
                    k++;
                    matrix[k] = [];
                }

                matrix[k].push(list[i]);
            }

            return matrix;
        }

        //calculate new saturations
        //console.log(Pnew);
        var Swnew = [
            []
        ];
        for (var i = 0; i < res.rows; i++) {
            Swnew[i] = [];
            for (var j = 0; j < res.cols; j++) {
                var Pnewi_pos, Pnewi_neg, Pnewj_pos, Pnewj_neg;
                if (i == 0) {
                    Pnewi_neg = 4500;
                } else {
                    Pnewi_neg = Pnew[i - 1][j];
                }
                if (j == 0) {
                    Pnewj_neg = 4500;
                } else {
                    Pnewj_neg = Pnew[i][j - 1];
                }
                if (i == res.rows - 1) {
                    Pnewi_pos = 4500;
                } else {
                    Pnewi_pos = Pnew[i + 1][j];
                }
                if (j == res.cols - 1) {
                    Pnewj_pos = 4500;
                } else {
                    Pnewj_pos = Pnew[i][j + 1];
                }
                Swnew[i][j] = res.cell[i][j].Sw + 1 / Cswo[i][j] * (
                    Txo_pos[i][j] * (Pnewi_pos - Pnew[i][j]) +
                    Txo_neg[i][j] * (Pnewi_neg - Pnew[i][j]) +
                    Tyo_pos[i][j] * (Pnewj_pos - Pnew[i][j]) +
                    Tyo_neg[i][j] * (Pnewj_neg - Pnew[i][j]) -
                    res.cell[i][j].qo_ -
                    Cpoo[i][j] * (Pnew[i][j] - res.cell[i][j].p)
                );
                if (Swnew[i][j] < 0) {
                    return returnModule();
                }
            }
        }
        //console.log('Snew', Swnew);

        //update pressures and saturations of reservoir
        for (var i = 0; i < res.cell.length; i++) {
            for (var j = 0; j < res.cell[0].length; j++) {
                res.cell[i][j].p = Pnew[i][j];
                res.cell[i][j].Sw = Swnew[i][j];
                res.cell[i][j].So = 1 - Swnew[i][j];
            }
        }

        //console.log('P_new = ', Pnew, '\n');
        //console.log('Sw_new = ', Swnew, '\n');

        //console.log('res = ', res);

        //go to next timestep
    }

    function returnModule() {
        console.log(Pnew);
        console.log(Swnew);
        console.log('done simulating.');
        return N_o; // {
        //     N_o: N_o,
        //     N_w: N_w,
        //     res: res
        // }
    }

    //console.log('N_o ', N_o);
    //console.log('N_w ' ,N_w);
    return returnModule();
}

exports.simulate = simulate;
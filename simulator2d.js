const extrapolate = require('./utilities.js').extrapolate;
const zeros = require('./utilities.js').zeros;
const exists = require('./utilities.js').exists;
const swof = require('./pvt.js').swof;
const pvt = require('./pvt.js').pvt;
const gauss = require('./gaussian-elimination-master/gauss.js');
//var fs = require('fs');

//some constants
const dt = 1; // timestep is 1 day
const Rs = 0.4;
const Pbp = 3337.0; //psi
const Pref = 14.7;
const cr = 3.0e-6;
const rho = {};
rho.o = 49.1;
rho.w = 64.79;
rho.g = 0.06054;

let simulate = function(res, wells, timesteps) {
    //set defaults
    if (timesteps === undefined) timesteps = 1;//Infinity;
    if (wells === undefined) wells = [];

    let N_o = 0;
    let N_w = 0;
    //simulate
    for (let timeIndex = 1; timeIndex <= timesteps; timeIndex++) { //number of timesteps to iterate (in days)
        //console.log('/////////////////////////////////////////////////////////////// ', 'day ', timeIndex, '\n');

        //set wells
        let q_ = res.addWells(wells);
        console.log(q_);
        N_o += q_.qo_;
        N_w += q_.qw_;

        res.qo_ = q_.qo_;
        res.qw_ = q_.qw_;

        let A = zeros(res.rows * res.cols, res.cols * res.rows);
        let darr = [];

        let Txo_neg = zeros(res.rows, res.cols);
        let Txo_pos = zeros(res.rows, res.cols);
        let Txw_neg = zeros(res.rows, res.cols);
        let Txw_pos = zeros(res.rows, res.cols);
        let Tyo_pos = zeros(res.rows, res.cols);
        let Tyo_neg = zeros(res.rows, res.cols);
        let Tyw_pos = zeros(res.rows, res.cols);
        let Tyw_neg = zeros(res.rows, res.cols);
        let Csww = zeros(res.rows, res.cols);
        let Cswo = zeros(res.rows, res.cols);
        let Cpoo = zeros(res.rows, res.cols);
        let Cpow = zeros(res.rows, res.cols);

        for (let i = 0; i < res.rows; i++) { //iterate on each gridblock
            for (let j = 0; j < res.cols; j++) {
                let alpha;
                let a, b, c, d, e, f;
                Cpoo[i][j] = res.cell[i][j].poro * (1 - res.cell[i][j].Sw) / dt * ((cr / res.Bo(i, j)) + res.d1_Bo_dPo(i, j));
                Cswo[i][j] = -res.cell[i][j].poro / (res.Bo(i, j) * dt);
                Cpow[i][j] = (res.cell[i][j].poro * res.cell[i][j].Sw) / dt * ((cr / res.Bw(i, j)) + res.d1_Bw_dPw(i, j));
                Csww[i][j] = res.cell[i][j].poro / (res.Bw(i, j) * dt) - res.dPcow_dSw(i, j) * Cpow[i][j];
                //console.log('Cpoo: ',Cpoo[i][j], 'Cpow', Cpow[i][j], 'Cswo', Cswo[i][j], 'Csww', Csww[i][j]);
                //return;

                // Cpoo[i][j] = 0.0001;
                // Cswo[i][j] = 0.0001;
                // Cpow[i][j] = 0.0001;
                // Csww[i][j] = 0.0001;

                alpha = -Cswo[i][j] / Csww[i][j];
                //console.log(alpha);

                let lambda_x_o_neg = 0;
                let lambda_x_o_pos = 0;
                let lambda_x_w_neg = 0;
                let lambda_x_w_pos = 0;
                let lambda_y_o_neg = 0;
                let lambda_y_o_pos = 0;
                let lambda_y_w_neg = 0;
                let lambda_y_w_pos = 0;

                if (exists(res.cell, i - 1, j)) {
                    lambda_x_o_neg = (res.cell[i - 1][j].p) >= res.cell[i][j].p ? res.kro(i-1, j) / res.visc_o(i - 1, j) / res.Bo(i - 1, j) : res.kro(i,j) / res.visc_o(i, j) / res.Bo(i, j);
                    lambda_x_w_neg = (res.cell[i - 1][j].p) >= res.cell[i][j].p ? res.krw(i-1,j) / res.visc_w(i - 1, j) / res.Bw(i - 1, j) : res.krw(i,j) / res.visc_w(i, j) / res.Bw(i, j);
                    Txo_neg[i][j] = 2 * lambda_x_o_neg / res.cell[i][j].dx / (res.cell[i - 1][j].dx / res.cell[i - 1][j].kx + res.cell[i][j].dx / res.cell[i][j].kx);
                    Txw_neg[i][j] = 2 * lambda_x_w_neg / res.cell[i][j].dx / (res.cell[i - 1][j].dx / res.cell[i - 1][j].kx + res.cell[i][j].dx / res.cell[i][j].kx);
                }

                if (exists(res.cell, i + 1, j)) {
                    lambda_x_o_pos = (res.cell[i + 1][j].p >= res.cell[i][j].p) ? res.kro(i+1,j) / res.visc_o(i + 1, j) / res.Bo(i + 1, j) : res.kro(i,j) / res.visc_o(i, j) / res.Bo(i, j);
                    lambda_x_w_pos = (res.cell[i + 1][j].p >= res.cell[i][j].p) ? res.krw(i+1,j) / res.visc_w(i + 1, j) / res.Bw(i + 1, j) : res.krw(i,j) / res.visc_w(i, j) / res.Bw(i, j);
                    Txo_pos[i][j] = 2 * lambda_x_o_pos / res.cell[i][j].dx / (res.cell[i + 1][j].dx / res.cell[i + 1][j].kx + res.cell[i][j].dx / res.cell[i][j].kx);
                    Txw_pos[i][j] = 2 * lambda_x_w_pos / res.cell[i][j].dx / (res.cell[i + 1][j].dx / res.cell[i + 1][j].kx + res.cell[i][j].dx / res.cell[i][j].kx);
                }

                if (exists(res.cell, i, j - 1)) {
                    lambda_y_o_neg = (res.cell[i][j - 1].p) >= res.cell[i][j].p ? res.kro(i, j-1) / res.visc_o(i, j - 1) / res.Bo(i, j - 1) : res.kro(i,j) / res.visc_o(i, j) / res.Bo(i, j);
                    lambda_y_w_neg = (res.cell[i][j - 1].p) >= res.cell[i][j].p ? res.krw(i, j-1) / res.visc_w(i, j - 1) / res.Bw(i, j - 1) : res.krw(i,j) / res.visc_w(i, j) / res.Bw(i, j);
                    Tyo_neg[i][j] = 2 * lambda_y_o_neg / res.cell[i][j].dy / (res.cell[i][j - 1].dy / res.cell[i][j - 1].ky + res.cell[i][j].dy / res.cell[i][j].ky);
                    Tyw_neg[i][j] = 2 * lambda_y_w_neg / res.cell[i][j].dy / (res.cell[i][j - 1].dy / res.cell[i][j - 1].ky + res.cell[i][j].dy / res.cell[i][j].ky);
                }

                if (exists(res.cell, i, j + 1)) {
                    lambda_y_o_pos = (res.cell[i][j + 1].p >= res.cell[i][j].p) ? res.kro(i, j+1) / res.visc_o(i, j + 1) / res.Bo(i, j + 1) : res.kro(i, j) / res.visc_o(i, j) / res.Bo(i, j);
                    lambda_y_w_pos = (res.cell[i][j + 1].p >= res.cell[i][j].p) ? res.krw(i, j+1) / res.visc_w(i, j + 1) / res.Bw(i, j + 1) : res.krw(i, j) / res.visc_w(i, j) / res.Bw(i, j);
                    Tyo_pos[i][j] = 2 * lambda_y_o_pos / res.cell[i][j].dy / (res.cell[i][j + 1].dy / res.cell[i][j + 1].ky + res.cell[i][j].dy / res.cell[i][j].ky);
                    Tyw_pos[i][j] = 2 * lambda_y_w_pos / res.cell[i][j].dy / (res.cell[i][j + 1].dy / res.cell[i][j + 1].ky + res.cell[i][j].dy / res.cell[i][j].ky);
                }

                //console.log(i, j);
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
                b = -(Txo_pos[i][j] + Txo_neg[i][j] + Tyo_pos[i][j] + Tyo_neg[i][j] + Cpoo[i][j]) - alpha * (Txw_pos[i][j] + Txw_neg[i][j] + Tyw_pos[i][j] + Tyw_neg[i][j] + Cpoo[i][j]);
                e = Tyo_neg[i][j] + alpha * Tyw_neg[i][j];
                f = Tyo_pos[i][j] + alpha * Tyw_pos[i][j];
                d = -(Cpoo[i][j] + alpha * Cpow[i][j]) * res.cell[i][j].p +
                    res.cell[i][j].qo_ + alpha * res.cell[i][j].qw_ +
                    alpha * Txw_pos[i][j] * (res.p_cow(i + 1, j) - res.p_cow(i, j)) +
                    alpha * Txw_neg[i][j] * (res.p_cow(i - 1, j) - res.p_cow(i, j)) +
                    alpha * Tyw_pos[i][j] * (res.p_cow(i, j + 1) - res.p_cow(i, j)) +
                    alpha * Tyw_neg[i][j] * (res.p_cow(i, j - 1) - res.p_cow(i, j));

                //console.log(d);//a, b, c, d, e, f);

                darr.push(d);

                let cellIndex = res.cell[i][j].index;
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

        //console.log('A = ', B, '\n');
        //console.log('d = ', darr, '\n');
        let P_new = gauss(A, darr);
        let Pnew = arrayToMatrix(P_new, res.cols);
        //console.log('P_new = ', Pnew, '\n');

        //stop solving if any of the pressures is less than bottom hole
        for (let wellIndex = 0; wellIndex < wells.length; wellIndex++) {
            if (Pnew[wells[wellIndex].loc.x][wells[wellIndex].loc.y] < wells[wellIndex].p_bh) {
                //console.log('stop simulation: p < p_bh, timestep: ', timeIndex);
                //return returnModule();
            }
        }

        function arrayToMatrix(list, elementsPerSubArray) {
            let matrix = [],
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
        let Swnew = [
            []
        ];
        for (let i = 0; i < res.rows; i++) {
            Swnew[i] = [];
            for (let j = 0; j < res.cols; j++) {
                let Pnewi_pos, Pnewi_neg, Pnewj_pos, Pnewj_neg;
                if (i === 0) {
                    Pnewi_neg = 4500;
                } else {
                    Pnewi_neg = Pnew[i - 1][j];
                }
                if (j === 0) {
                    Pnewj_neg = 4500;
                } else {
                    Pnewj_neg = Pnew[i][j - 1];
                }
                if (i === res.rows - 1) {
                    Pnewi_pos = 4500;
                } else {
                    Pnewi_pos = Pnew[i + 1][j];
                }
                if (j === res.cols - 1) {
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
                    //return returnModule();
                }
            }
        }
        //console.log('Snew', Swnew);
        res.day += timesteps;
        //update pressures and saturations of reservoir
        for (let i = 0; i < res.cell.length; i++) {
            for (let j = 0; j < res.cell[0].length; j++) {
                if(Pnew[i][j] < 0) Pnew[i][j] = 0;
                if(Pnew[i][j] > res.Pi) Pnew[i][j] = res.Pi;
                if(Swnew[i][j] < 0) Swnew[i][j] = 0;
                if(Swnew[i][j] > 1) Swnew[i][j] = 1;
                res.cell[i][j].p = Pnew[i][j];
                res.cell[i][j].Sw = Swnew[i][j];
                res.cell[i][j].So = 1 - Swnew[i][j];
            }
        }

        //console.log('P_new = ', Pnew, '\n');
        //console.log('Sw_new = ', Swnew, '\n');

        //console.log('res = ', res);

        // console.log(Pnew);
        // console.log(Swnew);
        for(let i = 0; i < res.rows; i++){
            for(let j = 0; j < res.cols; j++){
                //console.log(res.cell[i][j].p);
            }
        }
        //go to next timestep
    }

    function returnModule() {
        //res.Pr = res.Pr();
        res.N_o += N_o;
        console.log('done simulating.');
        return res; // {
        //     N_o: N_o,
        //     N_w: N_w,
        //     res: res
        // }
    }

    //console.log('N_o ', N_o);
    //console.log('N_w ' ,N_w);
    return returnModule();
};

exports.simulate = simulate;
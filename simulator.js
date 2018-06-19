var extrapolate = require('./utilities.js').extrapolate;
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
var dt = 1; // timestep is 1 day
var Rs = 0.4;
var Pbp = 3337.0; //psi
var Pref = 14.7;
var cr = 3.0E-6;
var rho = {};
rho.o = 49.1;
rho.w = 64.79;
rho.g = 0.06054;
var Pi = 6000; //initial pressure (psi)

var simulate = function(res, timesteps, wells) {
    //console.log(wells);
    //set defaults
    //if(timesteps == undefined) timesteps = 1;
    //if(wells == undefined) wells = {};

    var N_o = 0;
    var N_w = 0;
    //simulate
    for (var timeIndex = 1; timeIndex <= timesteps; timeIndex++) { //number of timesteps to iterate (in days)
        //console.log('/////////////////////////////////////////////////////////////// ', 'day ', timeIndex, '\n');

        // 	//set wells
        // 	for(var wellIndex = 0; wellIndex < wells.length; wellIndex++){
        // 		var loc = wells[wellIndex].loc;
        // 		var re = Math.sqrt(res.cell[loc].dy*res.cell[loc].dx/Math.PI);
        // 		var rw = 0.25;//ft
        // 		var WC = 0.0001*2*Math.PI*res.cell[loc].kx*res.cell[loc].dz/Math.log(re/rw);

        // 		var Area = Math.PI*re^2;
        // 		var kro = extrapolate(res.cell[loc].Sw, swof[0], swof[2]);
        // 		var krw = extrapolate(res.cell[loc].Sw, swof[0], swof[1]);
        // 		var lambda_o_well = 1/Bw(loc)*(kro/visc_o(loc)+krw/visc_w(loc));
        // 		var lambda_w_well = 1/Bo(loc)*(kro/visc_o(loc)+krw/visc_w(loc));

        // 		res.cell[loc].qo_ = WC/(Area*res.cell[loc].dx)*lambda_o_well*(res.cell[loc].p-wells[wellIndex].p_bh);
        // 		res.cell[loc].qw_ = WC/(Area*res.cell[loc].dx)*lambda_w_well*(res.cell[loc].p-p_cow(loc)-wells[wellIndex].p_bh);

        // 		//res.cell[loc].qo_ = wells[wellIndex].qo_;
        // 		//res.cell[loc].qw_ = wells[wellIndex].qw_;

        // 		res.cell[loc].qo_ = 5.614583*res.cell[loc].qo_;
        // 		res.cell[loc].qo_ = 5.614583*res.cell[loc].qw_;

        // 		N_o += res.cell[loc].qo_;
        // 		N_w += res.cell[loc].qw_;

        // 		//console.log('qo_', res.cell[loc].qo_);
        // 		//console.log('qw_', res.cell[loc].qw_);
        // 		//console.log('\n');
        // 	}
        var q_ = res.addWells(wells);
        //console.log(q_);
        N_o += q_.qo_;
        N_w += q_.qw_;

        var A = [];
        var darr = [];

        var Txo_neg = [];
        var Txo_pos = [];
        var Txw_neg = [];
        var Txw_pos = [];
        var Csww = [];
        var Cswo = [];
        var Cpoo = [];
        var Cpow = [];

        for (var i = 0; i < res.cell.length; i++) { //iterate on each gridblock
            var a, b, c, d;
            var alpha;

            Cpoo[i] = res.cell[i].poro * (1 - res.cell[i].Sw / dt * (cr / res.Bo(i) + res.d1_Bo_dPo(i)));
            Cswo[i] = -res.cell[i].poro / res.Bo(i) / dt;
            Cpow[i] = res.cell[i].poro * res.cell[i].Sw / dt * (cr / res.Bw(i) + res.d1_Bw_dPw(i));
            Csww[i] = res.cell[i].poro / res.Bw(i) / dt - res.dPcow_dSw(i) * Cpow[i];
            //console.log('Cpow: ',Cpow, 'Cpoo', Cpoo, 'Cswo', Cswo, 'Csww', Csww);

            alpha = -Csww[i] / Cswo[i];
            //console.log(alpha);

            if (i == 0) {
                lambda_o_neg = 0;
                lambda_w_neg = 0;
                lambda_o_pos = (res.cell[i + 1].p >= res.cell[i].p) ? res.cell[i + 1].kx / res.visc_o(i + 1) / res.Bo(i + 1) : res.cell[i].kx / res.visc_o(i) / res.Bo(i);
                lambda_w_pos = (res.cell[i + 1].p >= res.cell[i].p) ? res.cell[i + 1].kx / res.visc_w(i + 1) / res.Bw(i + 1) : res.cell[i].kx / res.visc_w(i) / res.Bw(i);

                Txo_pos[i] = 2 * lambda_o_pos / res.cell[i].dx / (res.cell[i + 1].dx / res.cell[i + 1].kx + res.cell[i].dx / res.cell[i].kx);
                Txo_neg[i] = 0;
                Txw_pos[i] = 2 * lambda_w_pos / res.cell[i].dx / (res.cell[i + 1].dx / res.cell[i + 1].kx + res.cell[i].dx / res.cell[i].kx);
                Txw_neg[i] = 0;

                d = -(Cpoo[i] + alpha * Cpow[i]) * res.cell[i].p + res.cell[i].qo_ + alpha * res.cell[i].qw_ + alpha * Txw_pos[i] * (res.p_cow(i + 1) - res.p_cow(i));
            } else if (i == res.cell.length - 1) {
                lambda_o_pos = 0;
                lambda_w_pos = 0;
                lambda_w_neg = (res.cell[i - 1].p) >= res.cell[i].p ? res.cell[i - 1].kx / res.visc_w(i - 1) / res.Bw(i - 1) : res.cell[i].kx / res.visc_w(i) / res.Bw(i);
                lambda_o_neg = (res.cell[i - 1].p) >= res.cell[i].p ? res.cell[i - 1].kx / res.visc_o(i - 1) / res.Bo(i - 1) : res.cell[i].kx / res.visc_o(i) / res.Bo(i);

                Txo_pos[i] = 0;
                Txo_neg[i] = 2 * lambda_o_neg / res.cell[i].dx / (res.cell[i - 1].dx / res.cell[i - 1].kx + res.cell[i].dx / res.cell[i].kx);
                Txw_pos[i] = 0;
                Txw_neg[i] = 2 * lambda_w_neg / res.cell[i].dx / (res.cell[i - 1].dx / res.cell[i - 1].kx + res.cell[i].dx / res.cell[i].kx);

                d = -(Cpoo[i] + alpha * Cpow[i]) * res.cell[i].p + res.cell[i].qo_ + alpha * res.cell[i].qw_ + alpha * Txw_neg[i] * (res.p_cow(i - 1) - res.p_cow(i));
            } else {
                lambda_o_pos = (res.cell[i + 1].p >= res.cell[i].p) ? res.cell[i + 1].kx / res.visc_o(i + 1) / res.Bo(i + 1) : res.cell[i].kx / res.visc_o(i) / res.Bo(i);
                lambda_o_neg = (res.cell[i - 1].p) >= res.cell[i].p ? res.cell[i - 1].kx / res.visc_o(i - 1) / res.Bo(i - 1) : res.cell[i].kx / res.visc_o(i) / res.Bo(i);
                lambda_w_pos = (res.cell[i + 1].p >= res.cell[i].p) ? res.cell[i + 1].kx / res.visc_w(i + 1) / res.Bw(i + 1) : res.cell[i].kx / res.visc_w(i) / res.Bw(i);
                lambda_w_neg = (res.cell[i - 1].p) >= res.cell[i].p ? res.cell[i - 1].kx / res.visc_w(i - 1) / res.Bw(i - 1) : res.cell[i].kx / res.visc_w(i) / res.Bw(i);

                Txo_pos[i] = 2 * lambda_o_pos / res.cell[i].dx / (res.cell[i + 1].dx / res.cell[i + 1].kx + res.cell[i].dx / res.cell[i].kx);
                Txo_neg[i] = 2 * lambda_o_neg / res.cell[i].dx / (res.cell[i - 1].dx / res.cell[i - 1].kx + res.cell[i].dx / res.cell[i].kx);
                Txw_pos[i] = 2 * lambda_w_pos / res.cell[i].dx / (res.cell[i + 1].dx / res.cell[i + 1].kx + res.cell[i].dx / res.cell[i].kx);
                Txw_neg[i] = 2 * lambda_w_neg / res.cell[i].dx / (res.cell[i - 1].dx / res.cell[i - 1].kx + res.cell[i].dx / res.cell[i].kx);
                d = -(Cpoo[i] + alpha * Cpow[i]) * res.cell[i].p + res.cell[i].qo_ + alpha * res.cell[i].qw_ + alpha * Txw_pos[i] * (res.p_cow(i + 1) - res.p_cow(i)) + alpha * Txw_neg[i] * (res.p_cow(i - 1) - res.p_cow(i));
            }

            Txo_neg[i] = Txo_neg[i] * 0.001127;
            Txo_pos[i] = Txo_pos[i] * 0.001127;
            Txw_neg[i] = Txw_neg[i] * 0.001127;
            Txw_pos[i] = Txw_pos[i] * 0.001127;

            a = Txo_neg[i] + alpha * Txw_neg[i];
            c = Txo_pos[i] + alpha * Txw_pos[i];
            b = -(Txo_pos[i] + Txo_neg[i] + Cpoo[i]) - alpha * (Txw_pos[i] + Txw_neg[i] + Cpow[i]);


            console.log(a, b, c, d);

            var row = [];
            for (var j = 0; j < res.cell.length; j++) {
                if (i == j + 1)
                    row[j] = a;
                else if (i == j)
                    row[j] = b;
                else if (i == j - 1)
                    row[j] = c;
                else
                    row[j] = 0;
            }

            A[i] = row;
            darr[i] = d;
        }

        var Pnew = [];
        //console.log('A = ', A, '\n');
        //console.log('d = ', darr, '\n');
        Pnew = gauss(A, darr);
        //console.log('P_new = ', Pnew = gauss(A, darr), '\n');


        //stop solving if any of the pressures is less than bottom hole
        for (var wellIndex = 0; wellIndex < wells.length; wellIndex++) {
            if (Pnew[wells[wellIndex].loc] < wells[wellIndex].p_bh) {
                //console.log('\n', 'stop simulation, p < p_bh ', );
                return N_o;
            }
        }
        //calculate new saturations
        var Swnew = [];
        for (var i = 0; i < res.cell.length; i++) {
            if (i == 0) {
                Pnew[-1] = 0;
                //console.log('Txo_neg', Txo_neg);
            } else if (i == res.cell.length - 1) {
                Pnew[res.cell.length] = 0;
            }
            Swnew[i] = res.cell[i].Sw + 1 / Cswo[i] * (Txo_pos[i] * (Pnew[i + 1] - Pnew[i]) + Txo_neg[i] * (Pnew[i - 1] - Pnew[i]) - res.cell[i].qo_ - Cpoo[i] * (Pnew[i] - res.cell[i].p));
            if (Swnew[i] < 0) {
                return N_o;
            }
        }

        //update pressures and saturations of reservoir
        for (var i = 0; i < res.cell.length; i++) {
            res.cell[i].p = Pnew[i];
            res.cell[i].Sw = Swnew[i];
            res.cell[i].So = 1 - Swnew[i];
        }

        //console.log('P_new = ', Pnew, '\n');
        //console.log('Sw_new = ', Swnew, '\n');

        //console.log('res = ', res);

        //go to next timestep
    }

    //console.log('N_o ', N_o);
    //console.log('N_w ' ,N_w);
    return N_o;
}

exports.simulate = simulate;
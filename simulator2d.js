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
var dt = 1;// timestep is 1 day
var Rs = 0.4;
var Pbp = 3337.0; //psi
var Pref = 14.7;
var cr = 3.0E-6;
var rho = {};
rho.o = 49.1;
rho.w = 64.79;
rho.g = 0.06054;
var Pi = 6000;//initial pressure (psi)

var simulate = function (res, timesteps, wells){
	//console.log(wells);
	//set defaults
	//if(timesteps == undefined) timesteps = 1;
	//if(wells == undefined) wells = {};

	var N_o = 0;
	var N_w = 0;
	//simulate
	for(var timeIndex = 1; timeIndex <= timesteps; timeIndex++){//number of timesteps to iterate (in days)
		//console.log('/////////////////////////////////////////////////////////////// ', 'day ', timeIndex, '\n');

		//set wells
		var q_ = res.addWells(wells);
		//console.log(q_);
		N_o += q_.qo_;
		N_w += q_.qw_;

		var A = [[]];
		var darr = [];

		var Txo_neg = [[]];
		var Txo_pos = [[]];
		var Txw_neg = [[]];
		var Txw_pos = [[]];
		var Tyo_pos = [[]];
		var Tyo_neg = [[]];
		var Tyw_pos = [[]];
		var Tyw_neg = [[]];
		var Csww = [[]];
		var Cswo = [[]];
		var Cpoo = [[]];
		var Cpow = [[]];

		for(var i = 0; i < res.cell.length; i++){//iterate on each gridblock
			for(var j = 0; j < res.cell[0].length; j++){
				var a, b, c, d;
				var alpha;

				Cpoo[i][j] = res.cell[i][j].poro*(1 - res.cell[i][j].Sw/dt*(cr/res.Bo(i,j) + res.d1_Bo_dPo(i,j)));
				Cswo[i][j] = - res.cell[i][j].poro/res.Bo(i,j)/dt;
				Cpow[i][j] = res.cell[i][j].poro*res.cell[i][j].Sw/dt*(cr/res.Bw(i,j) + res.d1_Bw_dPw(i,j));
				Csww[i][j] = res.cell[i][j].poro/res.Bw(i,j)/dt - res.dPcow_dSw(i,j)*Cpow[i][j];
				//console.log('Cpow: ',Cpow, 'Cpoo', Cpoo, 'Cswo', Cswo, 'Csww', Csww);

				alpha = -Cswo[i][j]/Csww[i][j];
				//console.log(alpha);

				if(i == 0 && j == 0){
					lambda_x_o_pos = (res.cell[i+1][j].p >= res.cell[i][j].p)?res.cell[i+1][j].kx/res.visc_o(i+1,j)/res.Bo(i+1,j):res.cell[i][j].kx/res.visc_o(i,j)/res.Bo(i,j);
					lambda_x_o_neg = 0;//(res.cell[i-1][j].p) >= res.cell[i][j].p?res.cell[i-1][j].kx/res.visc_o(i-1,j)/res.Bo(i-1,j):res.cell[i][j].kx/res.visc_o(i,j)/res.Bo(i,j);
					lambda_x_w_pos = (res.cell[i+1][j].p >= res.cell[i][j].p)?res.cell[i+1][j].kx/res.visc_w(i+1,j)/res.Bw(i+1,j):res.cell[i][j].kx/res.visc_w(i,j)/res.Bw(i,j);
					lambda_x_w_neg = 0;//(res.cell[i-1][j].p) >= res.cell[i][j].p?res.cell[i-1][j].kx/res.visc_w(i-1,j)/res.Bw(i-1,j):res.cell[i][j].kx/res.visc_w(i,j)/res.Bw(i,j);
					lambda_y_o_pos = (res.cell[i][j+1].p >= res.cell[i][j].p)?res.cell[i][j+1].ky/res.visc_o(i,j+1)/res.Bo(i,j+1):res.cell[i][j].ky/res.visc_o(i,j)/res.Bo(i,j);
					lambda_y_o_neg = 0;//(res.cell[i][j-1].p) >= res.cell[i][j].p?res.cell[i][j-1].ky/res.visc_o(i,j-1)/res.Bo(i,j-1):res.cell[i][j].ky/res.visc_o(i,j)/res.Bo(i,j);
					lambda_y_w_pos = (res.cell[i][j+1].p >= res.cell[i][j].p)?res.cell[i][j+1].ky/res.visc_w(i,j+1)/res.Bw(i,j+1):res.cell[i][j].ky/res.visc_w(i,j)/res.Bw(i,j);
					lambda_y_w_neg = 0;//(res.cell[i][j-1].p) >= res.cell[i][j].p?res.cell[i][j-1].ky/res.visc_w(i,j-1)/res.Bw(i,j-1):res.cell[i][j].ky/res.visc_w(i,j)/res.Bw(i,j);

					Txo_pos[i][j] = 2*lambda_x_o_pos/res.cell[i][j].dx/(res.cell[i+1][j].dx/res.cell[i+1][j].kx + res.cell[i][j].dx/res.cell[i][j].kx);
					Txo_neg[i][j] = 0;//2*lambda_x_o_neg/res.cell[i][j].dx/(res.cell[i-1][j].dx/res.cell[i-1][j].kx + res.cell[i][j].dx/res.cell[i][j].kx);
					Txw_pos[i][j] = 2*lambda_x_w_pos/res.cell[i][j].dx/(res.cell[i+1][j].dx/res.cell[i+1][j].kx + res.cell[i][j].dx/res.cell[i][j].kx);
					Txw_neg[i][j] = 0;//2*lambda_x_w_neg/res.cell[i][j].dx/(res.cell[i-1][j].dx/res.cell[i-1][j].kx + res.cell[i][j].dx/res.cell[i][j].kx);
					Tyo_pos[i][j] = 2*lambda_y_o_pos/res.cell[i][j].dy/(res.cell[i][j+1].dy/res.cell[i][j+1].ky + res.cell[i][j].dy/res.cell[i][j].ky);
					Tyo_neg[i][j] = 0;//2*lambda_y_o_neg/res.cell[i][j].dy/(res.cell[i][j-1].dy/res.cell[i][j-1].ky + res.cell[i][j].dy/res.cell[i][j].ky);
					Tyw_pos[i][j] = 2*lambda_y_w_pos/res.cell[i][j].dy/(res.cell[i][j+1].dy/res.cell[i][j+1].ky + res.cell[i][j].dy/res.cell[i][j].ky);
					Tyw_neg[i][j] = 0;//2*lambda_y_w_neg/res.cell[i][j].dy/(res.cell[i][j-1].dy/res.cell[i][j-1].ky + res.cell[i][j].dy/res.cell[i][j].ky);
					d = (Cpoo[i][j] + alpha*Cpow[i][j])*res.cell[i][j].p - res.cell[i][j].qo_ - alpha*res.cell[i][j].qw_ - alpha*Txw_pos[i][j]*(res.p_cow(i+1, j) - res.p_cow(i, j)) - alpha*Tyw_pos[i][j]*(res.p_cow(i, j+1) - res.p_cow(i, j));
				}
				else if(i == res.cell.length-1 && j == res.cell[0].length-1){
					lambda_x_o_pos = 0;//(res.cell[i+1][j].p >= res.cell[i][j].p)?res.cell[i+1][j].kx/res.visc_o(i+1,j)/res.Bo(i+1,j):res.cell[i][j].kx/res.visc_o(i,j)/res.Bo(i,j);
					lambda_x_o_neg = (res.cell[i-1][j].p) >= res.cell[i][j].p?res.cell[i-1][j].kx/res.visc_o(i-1,j)/res.Bo(i-1,j):res.cell[i][j].kx/res.visc_o(i,j)/res.Bo(i,j);
					lambda_x_w_pos = 0;//(res.cell[i+1][j].p >= res.cell[i][j].p)?res.cell[i+1][j].kx/res.visc_w(i+1,j)/res.Bw(i+1,j):res.cell[i][j].kx/res.visc_w(i,j)/res.Bw(i,j);
					lambda_x_w_neg = (res.cell[i-1][j].p) >= res.cell[i][j].p?res.cell[i-1][j].kx/res.visc_w(i-1,j)/res.Bw(i-1,j):res.cell[i][j].kx/res.visc_w(i,j)/res.Bw(i,j);
					lambda_y_o_pos = 0;//(res.cell[i][j+1].p >= res.cell[i][j].p)?res.cell[i][j+1].ky/res.visc_o(i,j+1)/res.Bo(i,j+1):res.cell[i][j].ky/res.visc_o(i,j)/res.Bo(i,j);
					lambda_y_o_neg = (res.cell[i][j-1].p) >= res.cell[i][j].p?res.cell[i][j-1].ky/res.visc_o(i,j-1)/res.Bo(i,j-1):res.cell[i][j].ky/res.visc_o(i,j)/res.Bo(i,j);
					lambda_y_w_pos = 0;//(res.cell[i][j+1].p >= res.cell[i][j].p)?res.cell[i][j+1].ky/res.visc_w(i,j+1)/res.Bw(i,j+1):res.cell[i][j].ky/res.visc_w(i,j)/res.Bw(i,j);
					lambda_y_w_neg = (res.cell[i][j-1].p) >= res.cell[i][j].p?res.cell[i][j-1].ky/res.visc_w(i,j-1)/res.Bw(i,j-1):res.cell[i][j].ky/res.visc_w(i,j)/res.Bw(i,j);

					Txo_pos[i][j] = 0;//2*lambda_x_o_pos/res.cell[i][j].dx/(res.cell[i+1][j].dx/res.cell[i+1][j].kx + res.cell[i][j].dx/res.cell[i][j].kx);
					Txo_neg[i][j] = 2*lambda_x_o_neg/res.cell[i][j].dx/(res.cell[i-1][j].dx/res.cell[i-1][j].kx + res.cell[i][j].dx/res.cell[i][j].kx);
					Txw_pos[i][j] = 0;//2*lambda_x_w_pos/res.cell[i][j].dx/(res.cell[i+1][j].dx/res.cell[i+1][j].kx + res.cell[i][j].dx/res.cell[i][j].kx);
					Txw_neg[i][j] = 2*lambda_x_w_neg/res.cell[i][j].dx/(res.cell[i-1][j].dx/res.cell[i-1][j].kx + res.cell[i][j].dx/res.cell[i][j].kx);
					Tyo_pos[i][j] = 0;//2*lambda_y_o_pos/res.cell[i][j].dy/(res.cell[i][j+1].dy/res.cell[i][j+1].ky + res.cell[i][j].dy/res.cell[i][j].ky);
					Tyo_neg[i][j] = 2*lambda_y_o_neg/res.cell[i][j].dy/(res.cell[i][j-1].dy/res.cell[i][j-1].ky + res.cell[i][j].dy/res.cell[i][j].ky);
					Tyw_pos[i][j] = 0;//2*lambda_y_w_pos/res.cell[i][j].dy/(res.cell[i][j+1].dy/res.cell[i][j+1].ky + res.cell[i][j].dy/res.cell[i][j].ky);
					Tyw_neg[i][j] = 2*lambda_y_w_neg/res.cell[i][j].dy/(res.cell[i][j-1].dy/res.cell[i][j-1].ky + res.cell[i][j].dy/res.cell[i][j].ky);
					d = (Cpoo[i][j] + alpha*Cpow[i][j])*res.cell[i][j].p - res.cell[i][j].qo_ - alpha*res.cell[i][j].qw_ - alpha*Txw_neg[i][j]*(res.p_cow(i-1, j) - res.p_cow(i, j)) - alpha*Tyw_neg[i][j]*(res.p_cow(i, j-1) - res.p_cow(i, j));
				}
				else if(j == 0 && i == res.cell[0].length-1){
					lambda_x_o_pos = 0;//(res.cell[i+1][j].p >= res.cell[i][j].p)?res.cell[i+1][j].kx/res.visc_o(i+1,j)/res.Bo(i+1,j):res.cell[i][j].kx/res.visc_o(i,j)/res.Bo(i,j);
					lambda_x_o_neg = (res.cell[i-1][j].p) >= res.cell[i][j].p?res.cell[i-1][j].kx/res.visc_o(i-1,j)/res.Bo(i-1,j):res.cell[i][j].kx/res.visc_o(i,j)/res.Bo(i,j);
					lambda_x_w_pos = 0;//(res.cell[i+1][j].p >= res.cell[i][j].p)?res.cell[i+1][j].kx/res.visc_w(i+1,j)/res.Bw(i+1,j):res.cell[i][j].kx/res.visc_w(i,j)/res.Bw(i,j);
					lambda_x_w_neg = (res.cell[i-1][j].p) >= res.cell[i][j].p?res.cell[i-1][j].kx/res.visc_w(i-1,j)/res.Bw(i-1,j):res.cell[i][j].kx/res.visc_w(i,j)/res.Bw(i,j);
					lambda_y_o_pos = (res.cell[i][j+1].p >= res.cell[i][j].p)?res.cell[i][j+1].ky/res.visc_o(i,j+1)/res.Bo(i,j+1):res.cell[i][j].ky/res.visc_o(i,j)/res.Bo(i,j);
					lambda_y_o_neg = 0;//(res.cell[i][j-1].p) >= res.cell[i][j].p?res.cell[i][j-1].ky/res.visc_o(i,j-1)/res.Bo(i,j-1):res.cell[i][j].ky/res.visc_o(i,j)/res.Bo(i,j);
					lambda_y_w_pos = (res.cell[i][j+1].p >= res.cell[i][j].p)?res.cell[i][j+1].ky/res.visc_w(i,j+1)/res.Bw(i,j+1):res.cell[i][j].ky/res.visc_w(i,j)/res.Bw(i,j);
					lambda_y_w_neg = 0;//(res.cell[i][j-1].p) >= res.cell[i][j].p?res.cell[i][j-1].ky/res.visc_w(i,j-1)/res.Bw(i,j-1):res.cell[i][j].ky/res.visc_w(i,j)/res.Bw(i,j);

					Txo_pos[i][j] = 0;//2*lambda_x_o_pos/res.cell[i][j].dx/(res.cell[i+1][j].dx/res.cell[i+1][j].kx + res.cell[i][j].dx/res.cell[i][j].kx);
					Txo_neg[i][j] = 2*lambda_x_o_neg/res.cell[i][j].dx/(res.cell[i-1][j].dx/res.cell[i-1][j].kx + res.cell[i][j].dx/res.cell[i][j].kx);
					Txw_pos[i][j] = 0;//2*lambda_x_w_pos/res.cell[i][j].dx/(res.cell[i+1][j].dx/res.cell[i+1][j].kx + res.cell[i][j].dx/res.cell[i][j].kx);
					Txw_neg[i][j] = 2*lambda_x_w_neg/res.cell[i][j].dx/(res.cell[i-1][j].dx/res.cell[i-1][j].kx + res.cell[i][j].dx/res.cell[i][j].kx);
					Tyo_pos[i][j] = 2*lambda_y_o_pos/res.cell[i][j].dy/(res.cell[i][j+1].dy/res.cell[i][j+1].ky + res.cell[i][j].dy/res.cell[i][j].ky);
					Tyo_neg[i][j] = 0;//2*lambda_y_o_neg/res.cell[i][j].dy/(res.cell[i][j-1].dy/res.cell[i][j-1].ky + res.cell[i][j].dy/res.cell[i][j].ky);
					Tyw_pos[i][j] = 2*lambda_y_w_pos/res.cell[i][j].dy/(res.cell[i][j+1].dy/res.cell[i][j+1].ky + res.cell[i][j].dy/res.cell[i][j].ky);
					Tyw_neg[i][j] = 0;//2*lambda_y_w_neg/res.cell[i][j].dy/(res.cell[i][j-1].dy/res.cell[i][j-1].ky + res.cell[i][j].dy/res.cell[i][j].ky);
					d = (Cpoo[i][j] + alpha*Cpow[i][j])*res.cell[i][j].p - res.cell[i][j].qo_ - alpha*res.cell[i][j].qw_ - alpha*Txw_neg[i][j]*(res.p_cow(i-1, j) - res.p_cow(i, j)) - alpha*Tyw_pos[i][j]*(res.p_cow(i, j+1) - res.p_cow(i, j));
				}
				else if(i == res.cell.length && j == 0){
					lambda_x_o_pos = (res.cell[i+1][j].p >= res.cell[i][j].p)?res.cell[i+1][j].kx/res.visc_o(i+1,j)/res.Bo(i+1,j):res.cell[i][j].kx/res.visc_o(i,j)/res.Bo(i,j);
					lambda_x_o_neg = 0;//(res.cell[i-1][j].p) >= res.cell[i][j].p?res.cell[i-1][j].kx/res.visc_o(i-1,j)/res.Bo(i-1,j):res.cell[i][j].kx/res.visc_o(i,j)/res.Bo(i,j);
					lambda_x_w_pos = (res.cell[i+1][j].p >= res.cell[i][j].p)?res.cell[i+1][j].kx/res.visc_w(i+1,j)/res.Bw(i+1,j):res.cell[i][j].kx/res.visc_w(i,j)/res.Bw(i,j);
					lambda_x_w_neg = 0;//(res.cell[i-1][j].p) >= res.cell[i][j].p?res.cell[i-1][j].kx/res.visc_w(i-1,j)/res.Bw(i-1,j):res.cell[i][j].kx/res.visc_w(i,j)/res.Bw(i,j);
					lambda_y_o_pos = 0;//(res.cell[i][j+1].p >= res.cell[i][j].p)?res.cell[i][j+1].ky/res.visc_o(i,j+1)/res.Bo(i,j+1):res.cell[i][j].ky/res.visc_o(i,j)/res.Bo(i,j);
					lambda_y_o_neg = (res.cell[i][j-1].p) >= res.cell[i][j].p?res.cell[i][j-1].ky/res.visc_o(i,j-1)/res.Bo(i,j-1):res.cell[i][j].ky/res.visc_o(i,j)/res.Bo(i,j);
					lambda_y_w_pos = 0;//(res.cell[i][j+1].p >= res.cell[i][j].p)?res.cell[i][j+1].ky/res.visc_w(i,j+1)/res.Bw(i,j+1):res.cell[i][j].ky/res.visc_w(i,j)/res.Bw(i,j);
					lambda_y_w_neg = (res.cell[i][j-1].p) >= res.cell[i][j].p?res.cell[i][j-1].ky/res.visc_w(i,j-1)/res.Bw(i,j-1):res.cell[i][j].ky/res.visc_w(i,j)/res.Bw(i,j);

					Txo_pos[i][j] = 2*lambda_x_o_pos/res.cell[i][j].dx/(res.cell[i+1][j].dx/res.cell[i+1][j].kx + res.cell[i][j].dx/res.cell[i][j].kx);
					Txo_neg[i][j] = 0;//2*lambda_x_o_neg/res.cell[i][j].dx/(res.cell[i-1][j].dx/res.cell[i-1][j].kx + res.cell[i][j].dx/res.cell[i][j].kx);
					Txw_pos[i][j] = 2*lambda_x_w_pos/res.cell[i][j].dx/(res.cell[i+1][j].dx/res.cell[i+1][j].kx + res.cell[i][j].dx/res.cell[i][j].kx);
					Txw_neg[i][j] = 0;//2*lambda_x_w_neg/res.cell[i][j].dx/(res.cell[i-1][j].dx/res.cell[i-1][j].kx + res.cell[i][j].dx/res.cell[i][j].kx);
					Tyo_pos[i][j] = 0;//2*lambda_y_o_pos/res.cell[i][j].dy/(res.cell[i][j+1].dy/res.cell[i][j+1].ky + res.cell[i][j].dy/res.cell[i][j].ky);
					Tyo_neg[i][j] = 2*lambda_y_o_neg/res.cell[i][j].dy/(res.cell[i][j-1].dy/res.cell[i][j-1].ky + res.cell[i][j].dy/res.cell[i][j].ky);
					Tyw_pos[i][j] = 0;//2*lambda_y_w_pos/res.cell[i][j].dy/(res.cell[i][j+1].dy/res.cell[i][j+1].ky + res.cell[i][j].dy/res.cell[i][j].ky);
					Tyw_neg[i][j] = 2*lambda_y_w_neg/res.cell[i][j].dy/(res.cell[i][j-1].dy/res.cell[i][j-1].ky + res.cell[i][j].dy/res.cell[i][j].ky);
					d = (Cpoo[i][j] + alpha*Cpow[i][j])*res.cell[i][j].p - res.cell[i][j].qo_ - alpha*res.cell[i][j].qw_ - alpha*Txw_pos[i][j]*(res.p_cow(i+1, j) - res.p_cow(i, j)) - alpha*Tyw_neg[i][j]*(res.p_cow(i, j-1) - res.p_cow(i, j));
				
				}
				else if(j == 0){
					lambda_x_o_pos = (res.cell[i+1][j].p >= res.cell[i][j].p)?res.cell[i+1][j].kx/res.visc_o(i+1,j)/res.Bo(i+1,j):res.cell[i][j].kx/res.visc_o(i,j)/res.Bo(i,j);
					lambda_x_o_neg = (res.cell[i-1][j].p) >= res.cell[i][j].p?res.cell[i-1][j].kx/res.visc_o(i-1,j)/res.Bo(i-1,j):res.cell[i][j].kx/res.visc_o(i,j)/res.Bo(i,j);
					lambda_x_w_pos = (res.cell[i+1][j].p >= res.cell[i][j].p)?res.cell[i+1][j].kx/res.visc_w(i+1,j)/res.Bw(i+1,j):res.cell[i][j].kx/res.visc_w(i,j)/res.Bw(i,j);
					lambda_x_w_neg = (res.cell[i-1][j].p) >= res.cell[i][j].p?res.cell[i-1][j].kx/res.visc_w(i-1,j)/res.Bw(i-1,j):res.cell[i][j].kx/res.visc_w(i,j)/res.Bw(i,j);
					lambda_y_o_pos = (res.cell[i][j+1].p >= res.cell[i][j].p)?res.cell[i][j+1].ky/res.visc_o(i,j+1)/res.Bo(i,j+1):res.cell[i][j].ky/res.visc_o(i,j)/res.Bo(i,j);
					lambda_y_o_neg = 0;//(res.cell[i][j-1].p) >= res.cell[i][j].p?res.cell[i][j-1].ky/res.visc_o(i,j-1)/res.Bo(i,j-1):res.cell[i][j].ky/res.visc_o(i,j)/res.Bo(i,j);
					lambda_y_w_pos = (res.cell[i][j+1].p >= res.cell[i][j].p)?res.cell[i][j+1].ky/res.visc_w(i,j+1)/res.Bw(i,j+1):res.cell[i][j].ky/res.visc_w(i,j)/res.Bw(i,j);
					lambda_y_w_neg = 0;//(res.cell[i][j-1].p) >= res.cell[i][j].p?res.cell[i][j-1].ky/res.visc_w(i,j-1)/res.Bw(i,j-1):res.cell[i][j].ky/res.visc_w(i,j)/res.Bw(i,j);

					Txo_pos[i][j] = 2*lambda_x_o_pos/res.cell[i][j].dx/(res.cell[i+1][j].dx/res.cell[i+1][j].kx + res.cell[i][j].dx/res.cell[i][j].kx);
					Txo_neg[i][j] = 2*lambda_x_o_neg/res.cell[i][j].dx/(res.cell[i-1][j].dx/res.cell[i-1][j].kx + res.cell[i][j].dx/res.cell[i][j].kx);
					Txw_pos[i][j] = 2*lambda_x_w_pos/res.cell[i][j].dx/(res.cell[i+1][j].dx/res.cell[i+1][j].kx + res.cell[i][j].dx/res.cell[i][j].kx);
					Txw_neg[i][j] = 2*lambda_x_w_neg/res.cell[i][j].dx/(res.cell[i-1][j].dx/res.cell[i-1][j].kx + res.cell[i][j].dx/res.cell[i][j].kx);
					Tyo_pos[i][j] = 2*lambda_y_o_pos/res.cell[i][j].dy/(res.cell[i][j+1].dy/res.cell[i][j+1].ky + res.cell[i][j].dy/res.cell[i][j].ky);
					Tyo_neg[i][j] = 0;//2*lambda_y_o_neg/res.cell[i][j].dy/(res.cell[i][j-1].dy/res.cell[i][j-1].ky + res.cell[i][j].dy/res.cell[i][j].ky);
					Tyw_pos[i][j] = 2*lambda_y_w_pos/res.cell[i][j].dy/(res.cell[i][j+1].dy/res.cell[i][j+1].ky + res.cell[i][j].dy/res.cell[i][j].ky);
					Tyw_neg[i][j] = 0;//2*lambda_y_w_neg/res.cell[i][j].dy/(res.cell[i][j-1].dy/res.cell[i][j-1].ky + res.cell[i][j].dy/res.cell[i][j].ky);
					d = (Cpoo[i][j] + alpha*Cpow[i][j])*res.cell[i][j].p - res.cell[i][j].qo_ - alpha*res.cell[i][j].qw_ - alpha*Txw_pos[i][j]*(res.p_cow(i+1, j) - res.p_cow(i, j)) - alpha*Txw_neg[i][j]*(res.p_cow(i-1, j) - res.p_cow(i, j)) - alpha*Tyw_pos[i][j]*(res.p_cow(i, j+1) - res.p_cow(i, j));
				
				}
				else if(i == 0){
					console.log(i, j);
					lambda_x_o_pos = (res.cell[i+1][j].p >= res.cell[i][j].p)?res.cell[i+1][j].kx/res.visc_o(i+1,j)/res.Bo(i+1,j):res.cell[i][j].kx/res.visc_o(i,j)/res.Bo(i,j);
					lambda_x_o_neg = 0;//(res.cell[i-1][j].p) >= res.cell[i][j].p?res.cell[i-1][j].kx/res.visc_o(i-1,j)/res.Bo(i-1,j):res.cell[i][j].kx/res.visc_o(i,j)/res.Bo(i,j);
					lambda_x_w_pos = (res.cell[i+1][j].p >= res.cell[i][j].p)?res.cell[i+1][j].kx/res.visc_w(i+1,j)/res.Bw(i+1,j):res.cell[i][j].kx/res.visc_w(i,j)/res.Bw(i,j);
					lambda_x_w_neg = 0;//(res.cell[i-1][j].p) >= res.cell[i][j].p?res.cell[i-1][j].kx/res.visc_w(i-1,j)/res.Bw(i-1,j):res.cell[i][j].kx/res.visc_w(i,j)/res.Bw(i,j);
					lambda_y_o_pos = (res.cell[i][j+1].p >= res.cell[i][j].p)?res.cell[i][j+1].ky/res.visc_o(i,j+1)/res.Bo(i,j+1):res.cell[i][j].ky/res.visc_o(i,j)/res.Bo(i,j);
					lambda_y_o_neg = (res.cell[i][j-1].p) >= res.cell[i][j].p?res.cell[i][j-1].ky/res.visc_o(i,j-1)/res.Bo(i,j-1):res.cell[i][j].ky/res.visc_o(i,j)/res.Bo(i,j);
					lambda_y_w_pos = (res.cell[i][j+1].p >= res.cell[i][j].p)?res.cell[i][j+1].ky/res.visc_w(i,j+1)/res.Bw(i,j+1):res.cell[i][j].ky/res.visc_w(i,j)/res.Bw(i,j);
					lambda_y_w_neg = (res.cell[i][j-1].p) >= res.cell[i][j].p?res.cell[i][j-1].ky/res.visc_w(i,j-1)/res.Bw(i,j-1):res.cell[i][j].ky/res.visc_w(i,j)/res.Bw(i,j);

					Txo_pos[i][j] = 2*lambda_x_o_pos/res.cell[i][j].dx/(res.cell[i+1][j].dx/res.cell[i+1][j].kx + res.cell[i][j].dx/res.cell[i][j].kx);
					Txo_neg[i][j] = 0;//2*lambda_x_o_neg/res.cell[i][j].dx/(res.cell[i-1][j].dx/res.cell[i-1][j].kx + res.cell[i][j].dx/res.cell[i][j].kx);
					Txw_pos[i][j] = 2*lambda_x_w_pos/res.cell[i][j].dx/(res.cell[i+1][j].dx/res.cell[i+1][j].kx + res.cell[i][j].dx/res.cell[i][j].kx);
					Txw_neg[i][j] = 0;//2*lambda_x_w_neg/res.cell[i][j].dx/(res.cell[i-1][j].dx/res.cell[i-1][j].kx + res.cell[i][j].dx/res.cell[i][j].kx);
					Tyo_pos[i][j] = 2*lambda_y_o_pos/res.cell[i][j].dy/(res.cell[i][j+1].dy/res.cell[i][j+1].ky + res.cell[i][j].dy/res.cell[i][j].ky);
					Tyo_neg[i][j] = 2*lambda_y_o_neg/res.cell[i][j].dy/(res.cell[i][j-1].dy/res.cell[i][j-1].ky + res.cell[i][j].dy/res.cell[i][j].ky);
					Tyw_pos[i][j] = 2*lambda_y_w_pos/res.cell[i][j].dy/(res.cell[i][j+1].dy/res.cell[i][j+1].ky + res.cell[i][j].dy/res.cell[i][j].ky);
					Tyw_neg[i][j] = 2*lambda_y_w_neg/res.cell[i][j].dy/(res.cell[i][j-1].dy/res.cell[i][j-1].ky + res.cell[i][j].dy/res.cell[i][j].ky);
					d = (Cpoo[i][j] + alpha*Cpow[i][j])*res.cell[i][j].p - res.cell[i][j].qo_ - alpha*res.cell[i][j].qw_ - alpha*Txw_pos[i][j]*(res.p_cow(i+1, j) - res.p_cow(i, j)) - alpha*Tyw_pos[i][j]*(res.p_cow(i, j+1) - res.p_cow(i, j)) - alpha*Tyw_neg[i][j]*(res.p_cow(i, j-1) - res.p_cow(i, j));			
				}
				else if(j == res.cell.length-1){
					lambda_x_o_pos = (res.cell[i+1][j].p >= res.cell[i][j].p)?res.cell[i+1][j].kx/res.visc_o(i+1,j)/res.Bo(i+1,j):res.cell[i][j].kx/res.visc_o(i,j)/res.Bo(i,j);
					lambda_x_o_neg = (res.cell[i-1][j].p) >= res.cell[i][j].p?res.cell[i-1][j].kx/res.visc_o(i-1,j)/res.Bo(i-1,j):res.cell[i][j].kx/res.visc_o(i,j)/res.Bo(i,j);
					lambda_x_w_pos = (res.cell[i+1][j].p >= res.cell[i][j].p)?res.cell[i+1][j].kx/res.visc_w(i+1,j)/res.Bw(i+1,j):res.cell[i][j].kx/res.visc_w(i,j)/res.Bw(i,j);
					lambda_x_w_neg = (res.cell[i-1][j].p) >= res.cell[i][j].p?res.cell[i-1][j].kx/res.visc_w(i-1,j)/res.Bw(i-1,j):res.cell[i][j].kx/res.visc_w(i,j)/res.Bw(i,j);
					lambda_y_o_pos = 0;//(res.cell[i][j+1].p >= res.cell[i][j].p)?res.cell[i][j+1].ky/res.visc_o(i,j+1)/res.Bo(i,j+1):res.cell[i][j].ky/res.visc_o(i,j)/res.Bo(i,j);
					lambda_y_o_neg = (res.cell[i][j-1].p) >= res.cell[i][j].p?res.cell[i][j-1].ky/res.visc_o(i,j-1)/res.Bo(i,j-1):res.cell[i][j].ky/res.visc_o(i,j)/res.Bo(i,j);
					lambda_y_w_pos = 0;//(res.cell[i][j+1].p >= res.cell[i][j].p)?res.cell[i][j+1].ky/res.visc_w(i,j+1)/res.Bw(i,j+1):res.cell[i][j].ky/res.visc_w(i,j)/res.Bw(i,j);
					lambda_y_w_neg = (res.cell[i][j-1].p) >= res.cell[i][j].p?res.cell[i][j-1].ky/res.visc_w(i,j-1)/res.Bw(i,j-1):res.cell[i][j].ky/res.visc_w(i,j)/res.Bw(i,j);

					Txo_pos[i][j] = 2*lambda_x_o_pos/res.cell[i][j].dx/(res.cell[i+1][j].dx/res.cell[i+1][j].kx + res.cell[i][j].dx/res.cell[i][j].kx);
					Txo_neg[i][j] = 2*lambda_x_o_neg/res.cell[i][j].dx/(res.cell[i-1][j].dx/res.cell[i-1][j].kx + res.cell[i][j].dx/res.cell[i][j].kx);
					Txw_pos[i][j] = 2*lambda_x_w_pos/res.cell[i][j].dx/(res.cell[i+1][j].dx/res.cell[i+1][j].kx + res.cell[i][j].dx/res.cell[i][j].kx);
					Txw_neg[i][j] = 2*lambda_x_w_neg/res.cell[i][j].dx/(res.cell[i-1][j].dx/res.cell[i-1][j].kx + res.cell[i][j].dx/res.cell[i][j].kx);
					Tyo_pos[i][j] = 0;//2*lambda_y_o_pos/res.cell[i][j].dy/(res.cell[i][j+1].dy/res.cell[i][j+1].ky + res.cell[i][j].dy/res.cell[i][j].ky);
					Tyo_neg[i][j] = 2*lambda_y_o_neg/res.cell[i][j].dy/(res.cell[i][j-1].dy/res.cell[i][j-1].ky + res.cell[i][j].dy/res.cell[i][j].ky);
					Tyw_pos[i][j] = 0;//2*lambda_y_w_pos/res.cell[i][j].dy/(res.cell[i][j+1].dy/res.cell[i][j+1].ky + res.cell[i][j].dy/res.cell[i][j].ky);
					Tyw_neg[i][j] = 2*lambda_y_w_neg/res.cell[i][j].dy/(res.cell[i][j-1].dy/res.cell[i][j-1].ky + res.cell[i][j].dy/res.cell[i][j].ky);
					d = (Cpoo[i][j] + alpha*Cpow[i][j])*res.cell[i][j].p - res.cell[i][j].qo_ - alpha*res.cell[i][j].qw_ - alpha*Txw_pos[i][j]*(res.p_cow(i+1, j) - res.p_cow(i, j)) - alpha*Txw_neg[i][j]*(res.p_cow(i-1, j) - res.p_cow(i, j)) - alpha*Tyw_neg[i][j]*(res.p_cow(i, j-1) - res.p_cow(i, j));
				}
				else if(i == res.cell[0].length-1){
					lambda_x_o_pos = 0;//(res.cell[i+1][j].p >= res.cell[i][j].p)?res.cell[i+1][j].kx/res.visc_o(i+1,j)/res.Bo(i+1,j):res.cell[i][j].kx/res.visc_o(i,j)/res.Bo(i,j);
					lambda_x_o_neg = (res.cell[i-1][j].p) >= res.cell[i][j].p?res.cell[i-1][j].kx/res.visc_o(i-1,j)/res.Bo(i-1,j):res.cell[i][j].kx/res.visc_o(i,j)/res.Bo(i,j);
					lambda_x_w_pos = 0;//(res.cell[i+1][j].p >= res.cell[i][j].p)?res.cell[i+1][j].kx/res.visc_w(i+1,j)/res.Bw(i+1,j):res.cell[i][j].kx/res.visc_w(i,j)/res.Bw(i,j);
					lambda_x_w_neg = (res.cell[i-1][j].p) >= res.cell[i][j].p?res.cell[i-1][j].kx/res.visc_w(i-1,j)/res.Bw(i-1,j):res.cell[i][j].kx/res.visc_w(i,j)/res.Bw(i,j);
					lambda_y_o_pos = (res.cell[i][j+1].p >= res.cell[i][j].p)?res.cell[i][j+1].ky/res.visc_o(i,j+1)/res.Bo(i,j+1):res.cell[i][j].ky/res.visc_o(i,j)/res.Bo(i,j);
					lambda_y_o_neg = (res.cell[i][j-1].p) >= res.cell[i][j].p?res.cell[i][j-1].ky/res.visc_o(i,j-1)/res.Bo(i,j-1):res.cell[i][j].ky/res.visc_o(i,j)/res.Bo(i,j);
					lambda_y_w_pos = (res.cell[i][j+1].p >= res.cell[i][j].p)?res.cell[i][j+1].ky/res.visc_w(i,j+1)/res.Bw(i,j+1):res.cell[i][j].ky/res.visc_w(i,j)/res.Bw(i,j);
					lambda_y_w_neg = (res.cell[i][j-1].p) >= res.cell[i][j].p?res.cell[i][j-1].ky/res.visc_w(i,j-1)/res.Bw(i,j-1):res.cell[i][j].ky/res.visc_w(i,j)/res.Bw(i,j);

					Txo_pos[i][j] = 0;//2*lambda_x_o_pos/res.cell[i][j].dx/(res.cell[i+1][j].dx/res.cell[i+1][j].kx + res.cell[i][j].dx/res.cell[i][j].kx);
					Txo_neg[i][j] = 2*lambda_x_o_neg/res.cell[i][j].dx/(res.cell[i-1][j].dx/res.cell[i-1][j].kx + res.cell[i][j].dx/res.cell[i][j].kx);
					Txw_pos[i][j] = 0;//2*lambda_x_w_pos/res.cell[i][j].dx/(res.cell[i+1][j].dx/res.cell[i+1][j].kx + res.cell[i][j].dx/res.cell[i][j].kx);
					Txw_neg[i][j] = 2*lambda_x_w_neg/res.cell[i][j].dx/(res.cell[i-1][j].dx/res.cell[i-1][j].kx + res.cell[i][j].dx/res.cell[i][j].kx);
					Tyo_pos[i][j] = 2*lambda_y_o_pos/res.cell[i][j].dy/(res.cell[i][j+1].dy/res.cell[i][j+1].ky + res.cell[i][j].dy/res.cell[i][j].ky);
					Tyo_neg[i][j] = 2*lambda_y_o_neg/res.cell[i][j].dy/(res.cell[i][j-1].dy/res.cell[i][j-1].ky + res.cell[i][j].dy/res.cell[i][j].ky);
					Tyw_pos[i][j] = 2*lambda_y_w_pos/res.cell[i][j].dy/(res.cell[i][j+1].dy/res.cell[i][j+1].ky + res.cell[i][j].dy/res.cell[i][j].ky);
					Tyw_neg[i][j] = 2*lambda_y_w_neg/res.cell[i][j].dy/(res.cell[i][j-1].dy/res.cell[i][j-1].ky + res.cell[i][j].dy/res.cell[i][j].ky);
					d = (Cpoo[i][j] + alpha*Cpow[i][j])*res.cell[i][j].p - res.cell[i][j].qo_ - alpha*res.cell[i][j].qw_ - alpha*Txw_neg[i][j]*(res.p_cow(i-1, j) - res.p_cow(i, j)) - alpha*Tyw_pos[i][j]*(res.p_cow(i, j+1) - res.p_cow(i, j)) - alpha*Tyw_neg[i][j]*(res.p_cow(i, j-1) - res.p_cow(i, j));
				}
				else{
					lambda_x_o_pos = (res.cell[i+1][j].p >= res.cell[i][j].p)?res.cell[i+1][j].kx/res.visc_o(i+1,j)/res.Bo(i+1,j):res.cell[i][j].kx/res.visc_o(i,j)/res.Bo(i,j);
					lambda_x_o_neg = (res.cell[i-1][j].p) >= res.cell[i][j].p?res.cell[i-1][j].kx/res.visc_o(i-1,j)/res.Bo(i-1,j):res.cell[i][j].kx/res.visc_o(i,j)/res.Bo(i,j);
					lambda_x_w_pos = (res.cell[i+1][j].p >= res.cell[i][j].p)?res.cell[i+1][j].kx/res.visc_w(i+1,j)/res.Bw(i+1,j):res.cell[i][j].kx/res.visc_w(i,j)/res.Bw(i,j);
					lambda_x_w_neg = (res.cell[i-1][j].p) >= res.cell[i][j].p?res.cell[i-1][j].kx/res.visc_w(i-1,j)/res.Bw(i-1,j):res.cell[i][j].kx/res.visc_w(i,j)/res.Bw(i,j);
					lambda_y_o_pos = (res.cell[i][j+1].p >= res.cell[i][j].p)?res.cell[i][j+1].ky/res.visc_o(i,j+1)/res.Bo(i,j+1):res.cell[i][j].ky/res.visc_o(i,j)/res.Bo(i,j);
					lambda_y_o_neg = (res.cell[i][j-1].p) >= res.cell[i][j].p?res.cell[i][j-1].ky/res.visc_o(i,j-1)/res.Bo(i,j-1):res.cell[i][j].ky/res.visc_o(i,j)/res.Bo(i,j);
					lambda_y_w_pos = (res.cell[i][j+1].p >= res.cell[i][j].p)?res.cell[i][j+1].ky/res.visc_w(i,j+1)/res.Bw(i,j+1):res.cell[i][j].ky/res.visc_w(i,j)/res.Bw(i,j);
					lambda_y_w_neg = (res.cell[i][j-1].p) >= res.cell[i][j].p?res.cell[i][j-1].ky/res.visc_w(i,j-1)/res.Bw(i,j-1):res.cell[i][j].ky/res.visc_w(i,j)/res.Bw(i,j);

					Txo_pos[i][j] = 2*lambda_x_o_pos/res.cell[i][j].dx/(res.cell[i+1][j].dx/res.cell[i+1][j].kx + res.cell[i][j].dx/res.cell[i][j].kx);
					Txo_neg[i][j] = 2*lambda_x_o_neg/res.cell[i][j].dx/(res.cell[i-1][j].dx/res.cell[i-1][j].kx + res.cell[i][j].dx/res.cell[i][j].kx);
					Txw_pos[i][j] = 2*lambda_x_w_pos/res.cell[i][j].dx/(res.cell[i+1][j].dx/res.cell[i+1][j].kx + res.cell[i][j].dx/res.cell[i][j].kx);
					Txw_neg[i][j] = 2*lambda_x_w_neg/res.cell[i][j].dx/(res.cell[i-1][j].dx/res.cell[i-1][j].kx + res.cell[i][j].dx/res.cell[i][j].kx);
					Tyo_pos[i][j] = 2*lambda_y_o_pos/res.cell[i][j].dy/(res.cell[i][j+1].dy/res.cell[i][j+1].ky + res.cell[i][j].dy/res.cell[i][j].ky);
					Tyo_neg[i][j] = 2*lambda_y_o_neg/res.cell[i][j].dy/(res.cell[i][j-1].dy/res.cell[i][j-1].ky + res.cell[i][j].dy/res.cell[i][j].ky);
					Tyw_pos[i][j] = 2*lambda_y_w_pos/res.cell[i][j].dy/(res.cell[i][j+1].dy/res.cell[i][j+1].ky + res.cell[i][j].dy/res.cell[i][j].ky);
					Tyw_neg[i][j] = 2*lambda_y_w_neg/res.cell[i][j].dy/(res.cell[i][j-1].dy/res.cell[i][j-1].ky + res.cell[i][j].dy/res.cell[i][j].ky);
					d = (Cpoo[i][j] + alpha*Cpow[i][j])*res.cell[i][j].p - res.cell[i][j].qo_ - alpha*res.cell[i][j].qw_ - alpha*Txw_pos[i][j]*(res.p_cow(i+1, j) - res.p_cow(i, j)) - alpha*Txw_neg[i][j]*(res.p_cow(i-1, j) - res.p_cow(i, j)) - alpha*Tyw_pos[i][j]*(res.p_cow(i, j+1) - res.p_cow(i, j)) - alpha*Tyw_neg[i][j]*(res.p_cow(i, j-1) - res.p_cow(i, j));
				}

				Txo_neg[i][j] = Txo_neg[i][j]*0.001127;
				Txo_pos[i][j] = Txo_pos[i][j]*0.001127;
				Txw_neg[i][j] = Txw_neg[i][j]*0.001127;
				Txw_pos[i][j] = Txw_pos[i][j]*0.001127;
				Tyo_neg[i][j] = Tyo_neg[i][j]*0.001127;
				Tyo_pos[i][j] = Tyo_pos[i][j]*0.001127;
				Tyw_neg[i][j] = Tyw_neg[i][j]*0.001127;
				Tyw_pos[i][j] = Tyw_pos[i][j]*0.001127;

				a = Txo_neg[i][j] + alpha*Txw_neg[i][j];
				c = Txo_pos[i][j] + alpha*Txw_pos[i][j];
				b = -(Txo_pos[i][j] + Txo_neg[i][j] + Tyo_pos[i][j] + Tyo_neg[i][j] + Cpow[i][j]) - alpha*(Txw_pos[i][j] + Txw_neg[i][j] + Tyw_pos[i][j] + Tyw_neg[i][j] + Cpoo[i][j]);
				e = Tyo_neg[i][j] + alpha*Tyw_neg[i][j];
				f = Tyo_pos[i][j] + alpha*Tyw_pos[i][j];

				//var row =[];
				//console.log(res.cell.length, res.cell[0].length);
				for(var ri = 0; ri < res.cell.length*res.cell[0].length; ri++){
					A[ri] = [];
					for(var rj = 0; rj < res.cell.length*res.cell[0].length; rj++){
						//console.log(ri, rj);
						if(ri == rj + 1)
							A[ri][rj] = a;
						else if(ri == rj)
							A[ri][rj] = b;
						else if(ri == rj-1)
							A[ri][rj] = c;
						else
							A[ri][rj] = 0;
					}
				}

				darr.push(d);
			}
		}
				return A;
	//}

	var Pnew = [];
		//console.log('A = ', A, '\n');
		//console.log('d = ', darr, '\n');
		Pnew = gauss(A, darr);
		//console.log('P_new = ', Pnew = gauss(A, darr), '\n');


		//stop solving if any of the pressures is less than bottom hole
		for(var wellIndex = 0; wellIndex < wells.length; wellIndex++){
			if(Pnew[wells[wellIndex].loc] < wells[wellIndex].p_bh){
				//console.log('\n', 'stop simulation, p < p_bh ', );
				return N_o;
			}
		}
		//calculate new saturations
		// var Swnew = [];
		// for(var i = 0; i < res.cell.length; i++){
		// 	if(i == 0){
		// 		Pnew[-1] = 0;
		// 		//console.log('Txo_neg', Txo_neg);
		// 	}
		// 	else if(i == res.cell.length-1){
		// 		Pnew[res.cell.length] = 0;
		// 	}
		// 	Swnew[i] = res.cell[i].Sw+1/Cswo[i]*(Txo_pos[i]*(Pnew[i+1]-Pnew[i])+Txo_neg[i]*(Pnew[i-1]-Pnew[i])-res.cell[i].qo_-Cpoo[i]*(Pnew[i]-res.cell[i].p));
		// 	if(Swnew[i] < 0){
		// 		return N_o;
		// 	}
		// }

		//update pressures and saturations of reservoir
		// for(var i = 0; i < res.cell.length; i++){
		// 	res.cell[i].p = Pnew[i];
		// 	res.cell[i].Sw = Swnew[i];
		// 	res.cell[i].So = 1 - Swnew[i];
		// }

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
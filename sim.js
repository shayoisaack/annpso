var gauss = require('./gaussian-elimination-master/gauss.js');
//console.log(gauss([[1, 2], [2, 3]], [4, 5]));

var res = {};
res.cell = [];
for(var i = 0; i < 20; i++){
	res.cell[i] = new Cell(4500, 0.3, 100, 1000);
}

function Cell(p, poro, perm, dx){
	this.p = p;
	this.poro = poro;
	this.kx = perm;
	this.ky = perm;
	this.kz = 20; //md
	this.qo_ = 0;
	this.qw_ = 0;
	this.dx = dx; //ft
	this.dy = dx;
	this.dz = 50;
	this.Sw = 0.3;
	this.So = 1 - this.Sw;
}

//pvt properties
var swof = [[0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],//Sw 
			[0.00, 0.01, 0.02, 0.03, 0.04, 0.06, 0.19, 0.45, 0.78], //Krw
			[1.00, 0.99, 0.88, 0.67, 0.56, 0.39, 0.16, 0.00, 0.00], //Krow
			[326.2, 168.7, 101.2, 67.4, 52.9, 42.4, 0.00, 0.00, 0.00]]; //Pcow

			var pvt = {};
pvt.w = [4014.7, 1.029, 3.13E-6, 0.31, 0]; //Pref, Bw, Cw, ViscW
pvt.o = [[3337.0, 3725.0, 4139.5, 4573.2, 5053.9, 5487.5, 5813.9], //P
		[1.2600, 1.2555, 1.2507, 1.2463, 1.2417, 1.2377, 1.2356], //Bo
		[1.042, 1.072, 1.096, 1.118, 1.151, 1.174, 1.2]]; //ViscO

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

//functions to evaluate pvt properties
function extrapolate(val, arr1, arr2){
	var x1, x2, y1, y2;
	var pos = arr1.findIndex(function(element){
		return val < element;
	});
	if(pos < 1){
		x1 = arr1[0];
		x2 = arr1[1];
		y1 = arr2[0];
		y2 = arr2[1];
	}
	else if (pos > arr1.length-1){
		x1 = arr1[arr1.length-2];
		x2 = arr1[arr1.length-1];
		y1 = arr2[arr2.length-2];
		y2 = arr2[arr2.length-1];
	}
	else{
		x1 = arr1[pos-1];
		x2 = arr1[pos];
		y1 = arr2[pos-1];
		y2 = arr2[pos];
	}
	return y1 + (val - x1)*(y1 - y2)/(x1 - x2);
}

function Bo(i){
	return extrapolate(res.cell[i].p, pvt.o[0], pvt.o[1]);
}

function d1_Bo_dPo(i){
	var Bo1 = extrapolate(res.cell[i].p, pvt.o[0], pvt.o[1]);
	var Bo2 = extrapolate(res.cell[i].p+1, pvt.o[0], pvt.o[1]);

	return 1/Bo2 - 1/Bo1;//dp = 1 psi
}

function Bw(i){
	return pvt.w[1];
}

function d1_Bw_dPw(i){
	return 0;
}

function dPcow_dSw(i){
	var Pcow1 = extrapolate(res.cell[i].Sw, swof[0], swof[3]);
	var Pcow2 = extrapolate(res.cell[i].Sw+0.01, swof[0], swof[3]);
	return (Pcow2 - Pcow1)/0.01;
}

function visc_o(i){
	return extrapolate(res.cell[i].p, pvt.o[0], pvt.o[1]);
}

function visc_w(i){
	return pvt.w[3];
}

function p_cow(i){
	return extrapolate(res.cell[i].Sw, swof[0], swof[3]);
}

//set wells
// res.cell[5].qo_ = 0.001;//one well at cell 5 producing 2000 stb/day
// res.cell[5].qw_ = 0.0001;

// for(var timeIndex = 1; timeIndex <= 2; timeIndex++){//number of timesteps to iterate (in days)
// 	console.log('/////////////////////////////////////////////////////////////// ', 'day ', timeIndex, '\n');

// 	var A = [];
// 	var darr = [];

// 	var Txo_neg = [];
// 	var Txo_pos = [];
// 	var Txw_neg = [];
// 	var Txw_pos = [];
// 	var Csww = [];
// 	var Cswo = [];
// 	var Cpoo = [];
// 	var Cpow = [];

// 	for(var i = 0; i < res.cell.length; i++){//iterate on each gridblock
// 		var a, b, c, d;
// 		var alpha;

// 		Cpoo[i] = res.cell[i].poro*(1 - res.cell[i].Sw/dt*(cr/Bo(i) + d1_Bo_dPo(i)));
// 		Cswo[i] = - res.cell[i].poro/Bo(i)/dt;
// 		Cpow[i] = res.cell[i].poro*res.cell[i].Sw/dt*(cr/Bw(i) + d1_Bw_dPw(i));
// 		Csww[i] = res.cell[i].poro/Bw(i)/dt - dPcow_dSw(i)*Cpow[i];
// 		//console.log('Cpow: ',Cpow, 'Cpoo', Cpoo, 'Cswo', Cswo, 'Csww', Csww);

// 		alpha = -Csww[i]/Cswo[i];
// 		//console.log(alpha);

// 		if(i == 0){
// 			lambda_o_neg = 0;
// 			lambda_w_neg = 0;
// 			lambda_o_pos = (res.cell[i+1].p >= res.cell[i].p)?res.cell[i+1].kx/visc_o(i+1)/Bo(i+1):res.cell[i].kx/visc_o(i)/Bo(i);
// 			lambda_w_pos = (res.cell[i+1].p >= res.cell[i].p)?res.cell[i+1].kx/visc_w(i+1)/Bw(i+1):res.cell[i].kx/visc_w(i)/Bw(i);

// 			Txo_pos[i] = 2*lambda_o_pos/res.cell[i].dx/(res.cell[i+1].dx/res.cell[i+1].kx + res.cell[i].dx/res.cell[i].kx);
// 			Txo_neg[i] = 0;
// 			Txw_pos[i] = 2*lambda_w_pos/res.cell[i].dx/(res.cell[i+1].dx/res.cell[i+1].kx + res.cell[i].dx/res.cell[i].kx);
// 			Txw_neg[i] = 0;

// 			d = -(Cpoo[i] + alpha*Cpow[i])*res.cell[i].p + res.cell[i].qo_ + alpha*res.cell[i].qw_ + alpha*Txw_pos[i]*(p_cow(i+1) - p_cow(i));
// 		}
// 		else if(i == res.cell.length-1){
// 			lambda_o_pos = 0;
// 			lambda_w_pos = 0;
// 			lambda_w_neg = (res.cell[i-1].p) >= res.cell[i].p?res.cell[i-1].kx/visc_w(i-1)/Bw(i-1):res.cell[i].kx/visc_w(i)/Bw(i);
// 			lambda_o_neg = (res.cell[i-1].p) >= res.cell[i].p?res.cell[i-1].kx/visc_o(i-1)/Bo(i-1):res.cell[i].kx/visc_o(i)/Bo(i);

// 			Txo_pos[i] = 0;
// 			Txo_neg[i] = 2*lambda_o_neg/res.cell[i].dx/(res.cell[i-1].dx/res.cell[i-1].kx + res.cell[i].dx/res.cell[i].kx);
// 			Txw_pos[i] = 0;
// 			Txw_neg[i] = 2*lambda_w_neg/res.cell[i].dx/(res.cell[i-1].dx/res.cell[i-1].kx + res.cell[i].dx/res.cell[i].kx);

// 			d = -(Cpoo[i] + alpha*Cpow[i])*res.cell[i].p + res.cell[i].qo_ + alpha*res.cell[i].qw_ + alpha*Txw_neg[i]*(p_cow(i-1) - p_cow(i));
// 		}
// 		else{
// 			lambda_o_pos = (res.cell[i+1].p >= res.cell[i].p)?res.cell[i+1].kx/visc_o(i+1)/Bo(i+1):res.cell[i].kx/visc_o(i)/Bo(i);
// 			lambda_o_neg = (res.cell[i-1].p) >= res.cell[i].p?res.cell[i-1].kx/visc_o(i-1)/Bo(i-1):res.cell[i].kx/visc_o(i)/Bo(i);
// 			lambda_w_pos = (res.cell[i+1].p >= res.cell[i].p)?res.cell[i+1].kx/visc_w(i+1)/Bw(i+1):res.cell[i].kx/visc_w(i)/Bw(i);
// 			lambda_w_neg = (res.cell[i-1].p) >= res.cell[i].p?res.cell[i-1].kx/visc_w(i-1)/Bw(i-1):res.cell[i].kx/visc_w(i)/Bw(i);

// 			Txo_pos[i] = 2*lambda_o_pos/res.cell[i].dx/(res.cell[i+1].dx/res.cell[i+1].kx + res.cell[i].dx/res.cell[i].kx);
// 			Txo_neg[i] = 2*lambda_o_neg/res.cell[i].dx/(res.cell[i-1].dx/res.cell[i-1].kx + res.cell[i].dx/res.cell[i].kx);
// 			Txw_pos[i] = 2*lambda_w_pos/res.cell[i].dx/(res.cell[i+1].dx/res.cell[i+1].kx + res.cell[i].dx/res.cell[i].kx);
// 			Txw_neg[i] = 2*lambda_w_neg/res.cell[i].dx/(res.cell[i-1].dx/res.cell[i-1].kx + res.cell[i].dx/res.cell[i].kx);
// 			d = -(Cpoo[i] + alpha*Cpow[i])*res.cell[i].p + res.cell[i].qo_ + alpha*res.cell[i].qw_ + alpha*Txw_pos[i]*(p_cow(i+1) - p_cow(i)) + alpha*Txw_neg[i]*(p_cow(i-1) - p_cow(i));
// 		}

// 		a = Txo_neg[i] + alpha*Txw_neg[i];
// 		c = Txo_pos[i] + alpha*Txw_pos[i];
// 		b = -(Txo_pos[i] + Txo_neg[i] + Cpoo[i]) - alpha*(Txw_pos[i] + Txw_neg[i] + Cpow[i]);

// 		// a = Math.floor(a);
// 		// b = Math.floor(b);
// 		// c = Math.floor(c);
// 		// d = Math.floor(d);

// 		var row =[];
// 		for(var j = 0; j < res.cell.length; j++){
// 			if(i == j + 1)
// 				row[j] = a;
// 			else if(i == j)
// 				row[j] = b;
// 			else if(i == j-1)
// 				row[j] = c;
// 			else
// 				row[j] = 0;
// 		}

// 		A[i] = row;
// 		darr[i] = d;
// 	}

// 	var Pnew = [];
// 	//console.log('A = ', A, '\n');
// 	//console.log('d = ', darr, '\n');
// 	console.log('P_new = ', Pnew = gauss(A, darr), '\n');

// 	//calculate new saturations
// 	var Swnew = [];
// 	for(var i = 0; i < res.cell.length; i++){
// 		if(i == 0){
// 			Pnew[-1] = Pi
// 		}
// 		else if(i == res.cell.length-1){
// 			Pnew[res.cell.length] = Pi;
// 		}
// 		Swnew[i] = res.cell[i].Sw+1/Cswo[i]*(Txo_pos[i]*(Pnew[i+1]-Pnew[i])+Txo_neg[i]*(Pnew[i-1]-Pnew[i])-res.cell[i].qo_-Cpoo[i]*(Pnew[i]-res.cell[i].p));
// 	}

// 	//update pressures and saturations of reservoir
// 	for(var i = 0; i < res.cell.length; i++){
// 		res.cell[i].p = Pnew[i];
// 		res.cell[i].Sw = Swnew[i];
// 		res.cell[i].So = 1 - Swnew[i];
// 	}

// 	console.log('Sw_new = ', Swnew, '\n');

// 	//console.log('res = ', res);

// //go to next timestep
// }

simulate(res, 2, [{loc: 5, p_bh: 1500, qo_: 0.001, qw_: 0.0001}]);

function simulate(res, timesteps, wells){
	//console.log(wells);
	//set defaults
	//if(timesteps == undefined) timesteps = 1;
	//if(wells == undefined) wells = {};

	//set wells
	for(var wellIndex = 0; wellIndex < wells.length; wellIndex++){
		var loc = wells[wellIndex].loc;
		var re = Math.sqrt(res.cell[loc].dy*res.cell[loc].dx/Math.PI);
		var rw = 0.25;//ft
		var WC = 0.00001*2*Math.PI*res.cell[loc].kx*res.cell[loc].dz/Math.log(re/rw);

		var Area = Math.PI*re^2;
		var kro = extrapolate(res.cell[loc].Sw, swof[0], swof[2]);
		var krw = extrapolate(res.cell[loc].Sw, swof[0], swof[1]);
		var lambda_o_well = 1/Bw(loc)*(kro/visc_o(loc)+krw/visc_w(loc));
		var lambda_w_well = 1/Bo(loc)*(kro/visc_o(loc)+krw/visc_w(loc));

		res.cell[loc].qo_ = WC/(Area*res.cell[loc].dx)*lambda_o_well*(res.cell[loc].p-wells[wellIndex].p_bh);
		res.cell[loc].qw_ = WC/(Area*res.cell[loc].dx)*lambda_w_well*(res.cell[loc].p-p_cow(loc)-wells[wellIndex].p_bh);
		
		//res.cell[loc].qo_ = wells[wellIndex].qo_;
		//res.cell[loc].qw_ = wells[wellIndex].qw_;

		res.cell[loc].qo_ = 5.614583*res.cell[loc].qo_;
		res.cell[loc].qo_ = 5.614583*res.cell[loc].qw_;

		console.log('qo_', res.cell[loc].qo_);
		console.log('qw_', res.cell[loc].qw_);
	}

	//simulate
	for(var timeIndex = 1; timeIndex <= timesteps; timeIndex++){//number of timesteps to iterate (in days)
		console.log('/////////////////////////////////////////////////////////////// ', 'day ', timeIndex, '\n');

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

		for(var i = 0; i < res.cell.length; i++){//iterate on each gridblock
			var a, b, c, d;
			var alpha;

			Cpoo[i] = res.cell[i].poro*(1 - res.cell[i].Sw/dt*(cr/Bo(i) + d1_Bo_dPo(i)));
			Cswo[i] = - res.cell[i].poro/Bo(i)/dt;
			Cpow[i] = res.cell[i].poro*res.cell[i].Sw/dt*(cr/Bw(i) + d1_Bw_dPw(i));
			Csww[i] = res.cell[i].poro/Bw(i)/dt - dPcow_dSw(i)*Cpow[i];
			//console.log('Cpow: ',Cpow, 'Cpoo', Cpoo, 'Cswo', Cswo, 'Csww', Csww);

			alpha = -Csww[i]/Cswo[i];
			//console.log(alpha);

			if(i == 0){
				lambda_o_neg = 0;
				lambda_w_neg = 0;
				lambda_o_pos = (res.cell[i+1].p >= res.cell[i].p)?res.cell[i+1].kx/visc_o(i+1)/Bo(i+1):res.cell[i].kx/visc_o(i)/Bo(i);
				lambda_w_pos = (res.cell[i+1].p >= res.cell[i].p)?res.cell[i+1].kx/visc_w(i+1)/Bw(i+1):res.cell[i].kx/visc_w(i)/Bw(i);

				Txo_pos[i] = 2*lambda_o_pos/res.cell[i].dx/(res.cell[i+1].dx/res.cell[i+1].kx + res.cell[i].dx/res.cell[i].kx);
				Txo_neg[i] = 0;
				Txw_pos[i] = 2*lambda_w_pos/res.cell[i].dx/(res.cell[i+1].dx/res.cell[i+1].kx + res.cell[i].dx/res.cell[i].kx);
				Txw_neg[i] = 0;

				d = -(Cpoo[i] + alpha*Cpow[i])*res.cell[i].p + res.cell[i].qo_ + alpha*res.cell[i].qw_ + alpha*Txw_pos[i]*(p_cow(i+1) - p_cow(i));
			}
			else if(i == res.cell.length-1){
				lambda_o_pos = 0;
				lambda_w_pos = 0;
				lambda_w_neg = (res.cell[i-1].p) >= res.cell[i].p?res.cell[i-1].kx/visc_w(i-1)/Bw(i-1):res.cell[i].kx/visc_w(i)/Bw(i);
				lambda_o_neg = (res.cell[i-1].p) >= res.cell[i].p?res.cell[i-1].kx/visc_o(i-1)/Bo(i-1):res.cell[i].kx/visc_o(i)/Bo(i);

				Txo_pos[i] = 0;
				Txo_neg[i] = 2*lambda_o_neg/res.cell[i].dx/(res.cell[i-1].dx/res.cell[i-1].kx + res.cell[i].dx/res.cell[i].kx);
				Txw_pos[i] = 0;
				Txw_neg[i] = 2*lambda_w_neg/res.cell[i].dx/(res.cell[i-1].dx/res.cell[i-1].kx + res.cell[i].dx/res.cell[i].kx);

				d = -(Cpoo[i] + alpha*Cpow[i])*res.cell[i].p + res.cell[i].qo_ + alpha*res.cell[i].qw_ + alpha*Txw_neg[i]*(p_cow(i-1) - p_cow(i));
			}
			else{
				lambda_o_pos = (res.cell[i+1].p >= res.cell[i].p)?res.cell[i+1].kx/visc_o(i+1)/Bo(i+1):res.cell[i].kx/visc_o(i)/Bo(i);
				lambda_o_neg = (res.cell[i-1].p) >= res.cell[i].p?res.cell[i-1].kx/visc_o(i-1)/Bo(i-1):res.cell[i].kx/visc_o(i)/Bo(i);
				lambda_w_pos = (res.cell[i+1].p >= res.cell[i].p)?res.cell[i+1].kx/visc_w(i+1)/Bw(i+1):res.cell[i].kx/visc_w(i)/Bw(i);
				lambda_w_neg = (res.cell[i-1].p) >= res.cell[i].p?res.cell[i-1].kx/visc_w(i-1)/Bw(i-1):res.cell[i].kx/visc_w(i)/Bw(i);

				Txo_pos[i] = 2*lambda_o_pos/res.cell[i].dx/(res.cell[i+1].dx/res.cell[i+1].kx + res.cell[i].dx/res.cell[i].kx);
				Txo_neg[i] = 2*lambda_o_neg/res.cell[i].dx/(res.cell[i-1].dx/res.cell[i-1].kx + res.cell[i].dx/res.cell[i].kx);
				Txw_pos[i] = 2*lambda_w_pos/res.cell[i].dx/(res.cell[i+1].dx/res.cell[i+1].kx + res.cell[i].dx/res.cell[i].kx);
				Txw_neg[i] = 2*lambda_w_neg/res.cell[i].dx/(res.cell[i-1].dx/res.cell[i-1].kx + res.cell[i].dx/res.cell[i].kx);
				d = -(Cpoo[i] + alpha*Cpow[i])*res.cell[i].p + res.cell[i].qo_ + alpha*res.cell[i].qw_ + alpha*Txw_pos[i]*(p_cow(i+1) - p_cow(i)) + alpha*Txw_neg[i]*(p_cow(i-1) - p_cow(i));
			}

			Txo_neg[i] = Txo_neg[i]*0.001127;
			Txo_pos[i] = Txo_pos[i]*0.001127;
			Txw_neg[i] = Txw_neg[i]*0.001127;
			Txw_pos[i] = Txw_pos[i]*0.001127;

			a = Txo_neg[i] + alpha*Txw_neg[i];
			c = Txo_pos[i] + alpha*Txw_pos[i];
			b = -(Txo_pos[i] + Txo_neg[i] + Cpoo[i]) - alpha*(Txw_pos[i] + Txw_neg[i] + Cpow[i]);

			var row =[];
			for(var j = 0; j < res.cell.length; j++){
				if(i == j + 1)
					row[j] = a;
				else if(i == j)
					row[j] = b;
				else if(i == j-1)
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
		console.log('P_new = ', Pnew = gauss(A, darr), '\n');

		//calculate new saturations
		var Swnew = [];
		for(var i = 0; i < res.cell.length; i++){
			if(i == 0){
				Pnew[-1] = Pi;
				//console.log('Txo_neg', Txo_neg);
			}
			else if(i == res.cell.length-1){
				Pnew[res.cell.length] = Pi;
			}
			Swnew[i] = res.cell[i].Sw+1/Cswo[i]*(Txo_pos[i]*(Pnew[i+1]-Pnew[i])+Txo_neg[i]*(Pnew[i-1]-Pnew[i])-res.cell[i].qo_-Cpoo[i]*(Pnew[i]-res.cell[i].p));
		}

		//update pressures and saturations of reservoir
		for(var i = 0; i < res.cell.length; i++){
			res.cell[i].p = Pnew[i];
			res.cell[i].Sw = Swnew[i];
			res.cell[i].So = 1 - Swnew[i];
		}

		console.log('Sw_new = ', Swnew, '\n');

		//console.log('res = ', res);

	//go to next timestep
	}

	return res;
}
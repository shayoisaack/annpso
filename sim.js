var gauss = require('./gaussian-elimination-master/gauss.js');
//console.log(gauss([[1, 2], [2, 3]], [4, 5]));

var res = {};
res.cell = [];
for(var i = 0; i < 10; i++){
	res.cell[i] = new Cell(4500, 0.3, 100, 1000);
}

//some constants
var dt = 1;// timestep is 1 day

//console.log(res);

function Cell(p, poro, perm, dx){
	this.p = p;
	this.poro = poro;
	this.kx = perm;
	this.ky = perm;
	this.kz = 20; //md
	this.qo_ = 0;
	this.qw_ = 0;
	this.dx = dx; //ft
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

		var Rs = 0.4;
var Pbp = 3337.0; //psi
var Pref = 14.7;
var cr = 3.0E-6;
var rho = {};
rho.o = 49.1;
rho.w = 64.79;
rho.g = 0.06054;

//functions to evaluate pvt properties
function extrapolate(val, arr1, arr2){
	var pos = arr1.findIndex(function(element){
		return val < element;
	});
	return arr2[pos-1] + (val - arr1[pos-1]*(arr2[pos] - arr2[pos-1])/(arr1[pos] - arr1[pos-1]));
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
res.cell[5].qo_ = 2000;//one well at cell 5 producing 2000 stb/day

var A = [];
var darr = [];
//generate sparse matrix
for(var i = 0; i < res.cell.length; i++){
	var a, b, c, d;
	var Txo_neg, Txo_pos, Txw_neg, Txw_pos;
	var Csww, Cswo;
	var alpha;

	Cpoo = res.cell[i].poro*(1 - res.cell[i].Sw/dt*(cr/Bo(i) + d1_Bo_dPo(i)));
	Cswo = - res.cell[i].poro/Bo(i)/dt;
	Cpow = res.cell[i].poro*res.cell[i].Sw/dt*(cr/Bw(i) + d1_Bw_dPw(i));
	Csww = res.cell[i].poro/Bw(i)/dt - dPcow_dSw(i)*Cpow;
	//console.log('Cso: ',Cpow, Cpoo, Cswo, Csww);

	alpha = -Csww/Cswo;

	if(i == 0){
		lambda_o_neg = 0;
		lambda_w_neg = 0;
		lambda_o_pos = (res.cell[i+1].p >= res.cell[i].p)?res.cell[i+1].kx/visc_o(i+1)/Bo(i+1):res.cell[i].kx/visc_o(i)/Bo(i);
		lambda_w_pos = (res.cell[i+1].p >= res.cell[i].p)?res.cell[i+1].kx/visc_w(i+1)/Bw(i+1):res.cell[i].kx/visc_w(i)/Bw(i);

		Txo_pos = 2*lambda_o_pos/res.cell[i].dx/(res.cell[i+1].dx/res.cell[i+1].kx + res.cell[i].dx/res.cell[i].kx);
		Txo_neg = 0;
		Txw_pos = 2*lambda_w_pos/res.cell[i].dx/(res.cell[i+1].dx/res.cell[i+1].kx + res.cell[i].dx/res.cell[i].kx);
		Txw_neg = 0;

		d = -(Cpoo + alpha*Cpow)*res.cell[i].p + res.cell[i].qo_ + alpha*res.cell[i].qw_ + alpha*Txw_pos*(p_cow(i+1) - p_cow(i));
	}
	else if(i == res.cell.length-1){
		lambda_o_pos = 0;
		lambda_w_pos = 0;
		lambda_w_neg = (res.cell[i-1].p) >= res.cell[i].p?res.cell[i-1].kx/visc_w(i-1)/Bw(i-1):res.cell[i].kx/visc_w(i)/Bw(i);
		lambda_o_neg = (res.cell[i-1].p) >= res.cell[i].p?res.cell[i-1].kx/visc_o(i-1)/Bo(i-1):res.cell[i].kx/visc_o(i)/Bo(i);

		Txo_pos = 0;
		Txo_neg = 2*lambda_o_neg/res.cell[i].dx/(res.cell[i-1].dx/res.cell[i-1].kx + res.cell[i].dx/res.cell[i].kx);
		Txw_pos = 0;
		Txw_neg = 2*lambda_w_neg/res.cell[i].dx/(res.cell[i-1].dx/res.cell[i-1].kx + res.cell[i].dx/res.cell[i].kx);

		d = -(Cpoo + alpha*Cpow)*res.cell[i].p + res.cell[i].qo_ + alpha*res.cell[i].qw_ + alpha*Txw_neg*(p_cow(i-1) - p_cow(i));
	}
	else{
		lambda_o_pos = (res.cell[i+1].p >= res.cell[i].p)?res.cell[i+1].kx/visc_o(i+1)/Bo(i+1):res.cell[i].kx/visc_o(i)/Bo(i);
		lambda_o_neg = (res.cell[i-1].p) >= res.cell[i].p?res.cell[i-1].kx/visc_o(i-1)/Bo(i-1):res.cell[i].kx/visc_o(i)/Bo(i);
		lambda_w_pos = (res.cell[i+1].p >= res.cell[i].p)?res.cell[i+1].kx/visc_w(i+1)/Bw(i+1):res.cell[i].kx/visc_w(i)/Bw(i);
		lambda_w_neg = (res.cell[i-1].p) >= res.cell[i].p?res.cell[i-1].kx/visc_w(i-1)/Bw(i-1):res.cell[i].kx/visc_w(i)/Bw(i);

		Txo_pos = 2*lambda_o_pos/res.cell[i].dx/(res.cell[i+1].dx/res.cell[i+1].kx + res.cell[i].dx/res.cell[i].kx);
		Txo_neg = 2*lambda_o_neg/res.cell[i].dx/(res.cell[i-1].dx/res.cell[i-1].kx + res.cell[i].dx/res.cell[i].kx);
		Txw_pos = 2*lambda_w_pos/res.cell[i].dx/(res.cell[i+1].dx/res.cell[i+1].kx + res.cell[i].dx/res.cell[i].kx);
		Txw_neg = 2*lambda_w_neg/res.cell[i].dx/(res.cell[i-1].dx/res.cell[i-1].kx + res.cell[i].dx/res.cell[i].kx);
		d = -(Cpoo + alpha*Cpow)*res.cell[i].p + res.cell[i].qo_ + alpha*res.cell[i].qw_ + alpha*Txw_pos*(p_cow(i+1) - p_cow(i)) + alpha*Txw_neg*(p_cow(i-1) - p_cow(i));
	}

	a = Txo_neg + alpha*Txw_neg;
	c = Txo_pos + alpha*Txw_pos;
	b = -(Txo_pos + Txo_neg + Cpoo) - alpha*(Txw_pos + Txw_neg + Cpow);
	
	a = Math.floor(a);
	b = Math.floor(b);
	c = Math.floor(c);
	d = Math.floor(d);
	
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

console.log('A = ', A, '\n');
console.log('d = ', darr, '\n');
console.log('x(new pressures) = ', gauss(A, darr));
//end generate sparse matrix
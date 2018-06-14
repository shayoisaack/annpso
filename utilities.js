var pvt = require('./pvt.js').pvt;
var swof = require('./pvt.js').swof;
var res = require('./res.js').res;

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

exports.extrapolate = extrapolate;
exports.Bo = Bo;
exports.d1_Bo_dPo = d1_Bo_dPo;
exports.Bw = Bw;
exports.d1_Bw_dPw = d1_Bw_dPw;
exports.dPcow_dSw = dPcow_dSw;
exports.visc_o = visc_o;
exports.visc_w = visc_w;
exports.p_cow = p_cow;
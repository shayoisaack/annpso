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

// var res = {};
// res.cell = [];
// for(var i = 0; i < 100; i++){
// 	res.cell[i] = new Cell(4500, 0.3, 100, 1000);
// }

function Cell(p, poro, perm, dx){
	this.p = p;
	this.poro = poro;
	this.kx = perm;
	this.ky = perm;
	this.kz = perm/5; //md
	this.qo_ = 0;
	this.qw_ = 0;
	this.dx = dx; //ft
	this.dy = dx;
	this.dz = dx/20;
	this.Sw = 0.3;
	this.So = 1 - this.Sw;
}

function Res(gridblocks){
	this.cell = [];
	for(var i = 0; i < gridblocks; i++){
		this.cell[i] = new Cell(4500, 0.3, 100, 1000);
	}
	this.Bo = function(i){
		return extrapolate(this.cell[i].p, pvt.o[0], pvt.o[1]);
	}

	this.d1_Bo_dPo = function(i){
		var Bo1 = extrapolate(this.cell[i].p, pvt.o[0], pvt.o[1]);
		var Bo2 = extrapolate(this.cell[i].p+1, pvt.o[0], pvt.o[1]);

		return 1/Bo2 - 1/Bo1;//dp = 1 psi
	}

	this.Bw = function(i){
		return pvt.w[1];
	}

	this.d1_Bw_dPw = function(i){
		return 0;
	}

	this.dPcow_dSw = function(i){
		var Pcow1 = extrapolate(this.cell[i].Sw, swof[0], swof[3]);
		var Pcow2 = extrapolate(this.cell[i].Sw+0.01, swof[0], swof[3]);
		return (Pcow2 - Pcow1)/0.01;
	}

	this.visc_o = function(i){
		return extrapolate(this.cell[i].p, pvt.o[0], pvt.o[1]);
	}

	this.visc_w = function(i){
		return pvt.w[3];
	}

	this.p_cow = function(i){
		return extrapolate(this.cell[i].Sw, swof[0], swof[3]);
	}
	this.addWells = function(wells){
		if(wells == undefined) wells = [];
		for(var wellIndex = 0; wellIndex < wells.length; wellIndex++){
			var loc = wells[wellIndex].loc;
			var re = Math.sqrt(this.cell[loc].dy*this.cell[loc].dx/Math.PI);
			var rw = 0.25;//ft
			var WC = 0.0001*2*Math.PI*this.cell[loc].kx*this.cell[loc].dz/Math.log(re/rw);

			var Area = Math.PI*re^2;
			var kro = extrapolate(this.cell[loc].Sw, swof[0], swof[2]);
			var krw = extrapolate(this.cell[loc].Sw, swof[0], swof[1]);
			var lambda_o_well = 1/this.Bw(loc)*(kro/this.visc_o(loc)+krw/this.visc_w(loc));
			var lambda_w_well = 1/this.Bo(loc)*(kro/this.visc_o(loc)+krw/this.visc_w(loc));

			this.cell[loc].qo_ = WC/(Area*this.cell[loc].dx)*lambda_o_well*(this.cell[loc].p-wells[wellIndex].p_bh);
			this.cell[loc].qw_ = WC/(Area*this.cell[loc].dx)*lambda_w_well*(this.cell[loc].p-this.p_cow(loc)-wells[wellIndex].p_bh);

			//res.cell[loc].qo_ = wells[wellIndex].qo_;
			//res.cell[loc].qw_ = wells[wellIndex].qw_;

			this.cell[loc].qo_ = 5.614583*this.cell[loc].qo_;
			this.cell[loc].qo_ = 5.614583*this.cell[loc].qw_;

			this.cell[loc].qo_;
			this.cell[loc].qw_;

			return {qo_: this.cell[loc].qo_, qw_: this.cell[loc].qw_};
			//console.log('qo_', res.cell[loc].qo_);
			//console.log('qw_', res.cell[loc].qw_);
			//console.log('\n');
		}
	}
}

//exports.res = res;
exports.Res = Res;
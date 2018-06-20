var extrapolate = require('./utilities.js').extrapolate;
var swof = require('./pvt.js').swof;
var pvt = require('./pvt.js').pvt;

function Cell(p, poro, perm, dx) {
    this.p = p;
    this.poro = poro;
    this.kx = perm;
    this.ky = perm;
    this.kz = perm / 5; //md
    this.qo_ = 0;
    this.qw_ = 0;
    this.dx = dx; //ft
    this.dy = dx;
    this.dz = dx / 20;
    this.Sw = 0.3;
    this.So = 1 - this.Sw;
    // this.Txo_neg = 0;
    // this.Txo_pos = 0;
    // this.Txw_neg = 0;
    // this.Txw_pos = 0;
    // this.Tyo_pos = 0;
    // this.Tyo_neg = 0;
    // this.Tyw_pos = 0;
    // this.Tyw_neg = 0;
    // this.Csww = 0;
    // this.Cswo = 0;
    // this.Cpoo = 0;
    // this.Cpow = 0;
}

function Res(gridblocksX, gridblocksY) {
    this.Pi = 4500;//psi
    this.cell = [
        []
    ];
    for (var i = 0; i < gridblocksX; i++) {
        this.cell[i] = [];
        for (var j = 0; j < gridblocksY; j++) {
            this.cell[i][j] = new Cell(4500, 0.3, 100, 1000);
        }
    }
    this.Bo = function(i, j) {
        return extrapolate(this.cell[i][j].p, pvt.o[0], pvt.o[1]);
    }

    this.d1_Bo_dPo = function(i, j) {
        var Bo1 = extrapolate(this.cell[i][j].p, pvt.o[0], pvt.o[1]);
        var Bo2 = extrapolate(this.cell[i][j].p + 1, pvt.o[0], pvt.o[1]);

        return 1 / Bo2 - 1 / Bo1; //dp = 1 psi
    }

    this.Bw = function(i, j) {
        return pvt.w[1];
    }

    this.d1_Bw_dPw = function(i, j) {
        return 0;
    }

    this.dPcow_dSw = function(i, j) {
        var Pcow1 = extrapolate(this.cell[i][j].Sw, swof[0], swof[3]);
        var Pcow2 = extrapolate(this.cell[i][j].Sw + 0.01, swof[0], swof[3]);
        return (Pcow2 - Pcow1) / 0.01;
    }

    this.visc_o = function(i, j) {
        return extrapolate(this.cell[i][j].p, pvt.o[0], pvt.o[1]);
    }

    this.visc_w = function(i, j) {
        return pvt.w[3];
    }

    this.p_cow = function(i, j) {
        return extrapolate(this.cell[i][j].Sw, swof[0], swof[3]);
    }
    this.addWells = function(wells) {
        if (wells == undefined) wells = [];
        for (var wellIndex = 0; wellIndex < wells.length; wellIndex++) {
            var loc = wells[wellIndex].loc;
            var re = Math.sqrt(this.cell[loc.x][loc.y].dy * this.cell[loc.x][loc.y].dx / Math.PI);
            var rw = 0.25; //ft
            var WC = 0.0001 * 2 * Math.PI * this.cell[loc.x][loc.y].kx * this.cell[loc.x][loc.y].dz / Math.log(re / rw);

            var Area = Math.PI * re ^ 2;
            var kro = extrapolate(this.cell[loc.x][loc.y].Sw, swof[0], swof[2]);
            var krw = extrapolate(this.cell[loc.x][loc.y].Sw, swof[0], swof[1]);
            var lambda_o_well = 1 / this.Bw(loc.x, loc.y) * (kro / this.visc_o(loc.x, loc.y) + krw / this.visc_w(loc.x, loc.y));
            var lambda_w_well = 1 / this.Bo(loc.x, loc.y) * (kro / this.visc_o(loc.x, loc.y) + krw / this.visc_w(loc.x, loc.y));

            this.cell[loc.x][loc.y].qo_ = WC / (Area * this.cell[loc.x][loc.y].dx) * lambda_o_well * (this.cell[loc.x][loc.y].p - wells[wellIndex].p_bh);
            this.cell[loc.x][loc.y].qw_ = WC / (Area * this.cell[loc.x][loc.y].dx) * lambda_w_well * (this.cell[loc.x][loc.y].p - this.p_cow(loc.x, loc.y) - wells[wellIndex].p_bh);

            // this.cell[loc.x][loc.y].qo_ = 0.00001; //wells[wellIndex].qo_;
            // this.cell[loc.x][loc.y].qw_ = 0.000001; //wells[wellIndex].qw_;

            this.cell[loc.x][loc.y].qo_ = 5.614583*this.cell[loc.x][loc.y].qo_;
            this.cell[loc.x][loc.y].qo_ = 5.614583*this.cell[loc.x][loc.y].qw_;

            // this.cell[loc.x][loc.y].qo_;
            // this.cell[loc.x][loc.y].qw_;

            return { qo_: this.cell[loc.x][loc.y].qo_, qw_: this.cell[loc.x][loc.y].qw_ };
            //console.log('qo_', res.cell[loc].qo_);
            //console.log('qw_', res.cell[loc].qw_);
            //console.log('\n');
        }
    }
    this.calcTrans = function(){
    	
    }
}

//exports.res = res;
exports.Res = Res;
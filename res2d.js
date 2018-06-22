var extrapolate = require('./utilities.js').extrapolate;
var exists = require('./utilities.js').exists;
var swof = require('./pvt.js').swof;
var pvt = require('./pvt.js').pvt;

function Cell(index, p, poro, perm, dx) {
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
    this.index = index;
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
    this.Pi = 8500; //psi
    this.rows = gridblocksX;
    this.cols = gridblocksY;
    this.gridblocks = gridblocksX * gridblocksY;
    this.getIndex = function(row, col) {
        var index = 0;
        var long, short;
        if (gridblocksX > gridblocksY) {
            long = gridblocksX;
            short = gridblocksY;
        } else {
            long = gridblocksY;
            short = gridblocksX;
        }
        for (var i = 0; i < long; i++) {
            for (var j = 0; j < short; j++) {
                if (i == row && j == col) {
                    return index;
                }
                index++;
            }
        }
        return undefined;
    }
    this.cell = [
        []
    ];
    var index = 0;
    for (var i = 0; i < gridblocksX; i++) {
        this.cell[i] = [];
        for (var j = 0; j < gridblocksY; j++) {
            this.cell[i][j] = new Cell(index, 4500, 0.3, 100, 1000);
            index++;
        }
    }
    this.Bo = function(i, j) {
        return extrapolate(this.cell[i][j].p, pvt.o[0], pvt.o[1]);
    }

    this.d1_Bo_dPo = function(i, j) {
        var Bo1 = extrapolate(this.cell[i][j].p, pvt.o[0], pvt.o[1]);
        var Bo2 = extrapolate(this.cell[i][j].p + 0.01, pvt.o[0], pvt.o[1]);

        return (1 / Bo2 - 1 / Bo1) / 0.01; //dp = 0.01 psi
    }

    this.Bw = function(i, j) {
        return pvt.w[1];
    }

    this.d1_Bw_dPw = function(i, j) {
        return 1000 * this.d1_Bo_dPo(i, j); //0;
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
        if (exists(this.cell, i, j)) {
            return extrapolate(this.cell[i][j].Sw, swof[0], swof[3]);
        } else {
            return 1;
        }
    }
    this.addWells = function(wells) {
        if (wells == undefined) wells = [];
        var N_o = 0;
        var N_w = 0;
        for (var wellIndex = 0; wellIndex < wells.length; wellIndex++) {
            var loc = wells[wellIndex].loc;
            var re = Math.sqrt(this.cell[loc.x][loc.y].dy * this.cell[loc.x][loc.y].dx / Math.PI);
            var rw = 0.25; //ft
            var WC = 0.0001 * 2 * Math.PI * this.cell[loc.x][loc.y].kx * this.cell[loc.x][loc.y].dz / Math.log(re / rw);

            var Area = Math.PI * re ^ 2;
            var Volume = this.cell[loc.x][loc.y].dx * this.cell[loc.x][loc.y].dy * this.cell[loc.x][loc.y].dz;
            var kro = extrapolate(this.cell[loc.x][loc.y].Sw, swof[0], swof[2]);
            var krw = extrapolate(this.cell[loc.x][loc.y].Sw, swof[0], swof[1]);
            var lambda_o_well = 1 / this.Bw(loc.x, loc.y) * (kro / this.visc_o(loc.x, loc.y) + krw / this.visc_w(loc.x, loc.y));
            var lambda_w_well = 1 / this.Bo(loc.x, loc.y) * (kro / this.visc_o(loc.x, loc.y) + krw / this.visc_w(loc.x, loc.y));

            this.cell[loc.x][loc.y].qo_ = WC * this.Bo(loc.x, loc.y) / Volume * lambda_o_well * (this.cell[loc.x][loc.y].p - wells[wellIndex].p_bh);
            this.cell[loc.x][loc.y].qw_ = WC * this.Bw(loc.x, loc.y) / Volume * lambda_w_well * (this.cell[loc.x][loc.y].p - this.p_cow(loc.x, loc.y) - wells[wellIndex].p_bh);

            //this.cell[loc.x][loc.y].qo_ = wells[wellIndex].qo_* this.Bo(loc.x, loc.y) / Volume;
            //this.cell[loc.x][loc.y].qw_ = wells[wellIndex].qw_ * this.Bw(loc.x, loc.y) / Volume;

            // this.cell[loc.x][loc.y].qo_ = 5.614583 * this.cell[loc.x][loc.y].qo_;
            // this.cell[loc.x][loc.y].qo_ = 5.614583 * this.cell[loc.x][loc.y].qw_;

            N_o += this.cell[loc.x][loc.y].qo_;
            N_w += this.cell[loc.x][loc.y].qw_;

            //console.log('qo_', res.cell[loc].qo_);
            //console.log('qw_', res.cell[loc].qw_);
            //console.log('\n');
        }
        console.log('N_o', N_o);
        console.log('N_w', N_w);
        return { qo_: N_o, qw_: N_w };
    }
    this.calcTrans = function() {

    }
    this.linearize = function(wells, time) {//linearize reservoir properties from each cell for input to neural net
        var arr = [];
        for (var i = 0; i < this.cell.length; i++) {
            for (var j = 0; j < this.cell[0].length; j++) {
                // arr[arr.length] = this.cell[i].p;
                // arr[arr.length] = this.cell[i].poro;
                // arr[arr.length] = this.cell[i].kx;
                // arr[arr.length] = this.cell[i].ky;
                // arr[arr.length] = this.cell[i].kz;
                // arr[arr.length] = this.cell[i].qo_;
                // arr[arr.length] = this.cell[i].qw_;
                // arr[arr.length] = this.cell[i].dx;
                // arr[arr.length] = this.cell[i].dy;
                // arr[arr.length] = this.cell[i].dz;
                // arr[arr.length] = this.cell[i].Sw;
                // arr[arr.length] = this.cell[i].So;
                var pp = this.cell[i][j].p * this.cell[i][j].poro * this.cell[i][j].So;
                arr.push(pp);
            }
        }

        for (var i = 0; i < wells.length; i++) {
            arr[arr.length] = wells[i].loc.x;
            arr[arr.length] = wells[i].loc.y;
            arr[arr.length] = wells[i].p_bh;
        }

        arr[arr.length] = time;
        return arr;
    }
}

//exports.res = res;
exports.Res = Res;
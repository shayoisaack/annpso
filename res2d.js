const extrapolate = require('./utilities.js').extrapolate;
const exists = require('./utilities.js').exists;
const swof = require('./pvt.js').swof;
const pvt = require('./pvt.js').pvt;

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
}

function Res(gridblocksX, gridblocksY) {
    this.day = 0;
    this.Pi = 4500; //psi
    this.rows = gridblocksX;
    this.cols = gridblocksY;
    this.gridblocks = gridblocksX * gridblocksY;
    this.N_o = 0;
    this.getIndex = function(row, col) {
        let index = 0;
        let long, short;
        if (gridblocksX > gridblocksY) {
            long = gridblocksX;
            short = gridblocksY;
        } else {
            long = gridblocksY;
            short = gridblocksX;
        }
        for (let i = 0; i < long; i++) {
            for (let j = 0; j < short; j++) {
                if (i === row && j === col) {
                    return index;
                }
                index++;
            }
        }
        return undefined;
    };
    this.cell = [
        []
    ];
    let index = 0;
    for (let i = 0; i < gridblocksX; i++) {
        this.cell[i] = [];
        for (let j = 0; j < gridblocksY; j++) {
            this.cell[i][j] = new Cell(index, this.Pi, 0.3, 100, 1000);
            index++;
        }
    }
    this.Bo = function(i, j) {
        return extrapolate(this.cell[i][j].p, pvt.o[0], pvt.o[1]);
    };

    this.d1_Bo_dPo = function(i, j) {
        let Bo1 = extrapolate(this.cell[i][j].p, pvt.o[0], pvt.o[1]);
        let Bo2 = extrapolate(this.cell[i][j].p + 0.01, pvt.o[0], pvt.o[1]);

        return ((1 / Bo2) - (1 / Bo1)) / 0.01; //dp = 0.01 psi
    };

    this.Bw = function(i, j) {
        return pvt.w[1];
    };

    this.d1_Bw_dPw = function(i, j) {
        return 0;//0.1 * this.d1_Bo_dPo(i, j); //0;
    };

    this.dPcow_dSw = function(i, j) {
        let Pcow1 = extrapolate(this.cell[i][j].Sw, swof[0], swof[3]);
        let Pcow2 = extrapolate(this.cell[i][j].Sw + 0.01, swof[0], swof[3]);
        return (Pcow2 - Pcow1) / 0.01;
    };

    this.visc_o = function(i, j) {
        return extrapolate(this.cell[i][j].p, pvt.o[0], pvt.o[1]);
    };

    this.kro = function(i, j){
        return extrapolate(this.cell[i][j].Sw, swof[0], swof[2]);
    };

    this.krw = function(i, j){
        return extrapolate(this.cell[i][j].Sw, swof[0], swof[1]);
    };

    this.visc_w = function(i, j) {
        return pvt.w[3];
    };

    this.p_cow = function(i, j) {
        if (exists(this.cell, i, j)) {
            return extrapolate(this.cell[i][j].Sw, swof[0], swof[3]);
        } else {
            return 1;
        }
    };
    this.addWells = function(wells) {
        if (wells === undefined) wells = [];
        let N_o = 0;
        let N_w = 0;
        for (let wellIndex = 0; wellIndex < wells.length; wellIndex++) {
            let loc = wells[wellIndex].loc;
            let Volume = this.cell[loc.x][loc.y].dx * this.cell[loc.x][loc.y].dy * this.cell[loc.x][loc.y].dz;

            let kro = this.kro(loc.x, loc.y);
            let krw = this.krw(loc.x, loc.y);
            let lambda_o_well = 1 / this.Bw(loc.x, loc.y) * (kro / this.visc_o(loc.x, loc.y) + krw / this.visc_w(loc.x, loc.y));
            let lambda_w_well = 1 / this.Bo(loc.x, loc.y) * (kro / this.visc_o(loc.x, loc.y) + krw / this.visc_w(loc.x, loc.y));

            if (wells[wellIndex].condition === 'pressure' || wells[wellIndex].condition === undefined) {
                if(wells[wellIndex].p_bh === undefined) wells[wellIndex].p_bh = 3350;
                let re = Math.sqrt(this.cell[loc.x][loc.y].dy * this.cell[loc.x][loc.y].dx / Math.PI);
                let rw = 0.25; //ft
                let WC = 2 * Math.PI * this.cell[loc.x][loc.y].kx * this.cell[loc.x][loc.y].dz / Math.log(re / rw);

                //let Area = Math.PI * re ^ 2;

                this.cell[loc.x][loc.y].qo_ = WC * this.Bo(loc.x, loc.y) / Volume * lambda_o_well * (this.cell[loc.x][loc.y].p - wells[wellIndex].p_bh);
                this.cell[loc.x][loc.y].qw_ = WC * this.Bw(loc.x, loc.y) / Volume * lambda_w_well * (this.cell[loc.x][loc.y].p - this.p_cow(loc.x, loc.y) - wells[wellIndex].p_bh);

                if(this.cell[loc.x][loc.y].qo_ < 0) this.cell[loc.x][loc.y].qo_ = 0;
                if(this.cell[loc.x][loc.y].qw_ < 0) this.cell[loc.x][loc.y].qw_ = 0;

            } else if (wells[wellIndex].condition === 'rate') {
                this.cell[loc.x][loc.y].qo_ = wells[wellIndex].qo_ * this.Bo(loc.x, loc.y) / Volume;
                this.cell[loc.x][loc.y].qw_ = this.cell[loc.x][loc.y].qo_ * lambda_w_well / lambda_o_well;
            }

            this.cell[loc.x][loc.y].qo_ = 5.614583 * this.cell[loc.x][loc.y].qo_;
            this.cell[loc.x][loc.y].qo_ = 5.614583 * this.cell[loc.x][loc.y].qw_;

            N_o += this.cell[loc.x][loc.y].qo_*Volume/this.Bo(loc.x, loc.y)/5.614583;
            N_w += this.cell[loc.x][loc.y].qw_*Volume/this.Bw(loc.x, loc.y)/5.614583;
            //N_o += this.cell[loc.x][loc.y].qo_;
            //N_w += this.cell[loc.x][loc.y].qw_;

            //console.log('qo_', this.cell[loc.x][loc.y].qo_);
            //console.log('qw_', this.cell[loc.x][loc.y].qw_);
        }
        //console.log('N_o', N_o);
        //console.log('N_w', N_w);
        return { qo_: N_o, qw_: N_w };
    };
    this.linearize = function(wells, time) { //linearize reservoir properties from each cell for input to neural net
        let arr = [];
        for (let i = 0; i < this.cell.length; i++) {
            for (let j = 0; j < this.cell[0].length; j++) {
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
                let pp = this.cell[i][j].p * this.cell[i][j].poro * this.cell[i][j].So;
                arr.push(pp);
            }
        }

        for (let i = 0; i < wells.length; i++) {
            if(wells[i].p_bh === undefined) wells[i].p_bh = 3350;
            arr[arr.length] = wells[i].loc.x;
            arr[arr.length] = wells[i].loc.y;
            arr[arr.length] = wells[i].p_bh;
        }

        arr[arr.length] = time;
        return arr;
    };
    this.calcOIP = function() {
        let OIP = 0;
        for (let i = 0; i < this.cell.length; i++) {
            for (let j = 0; j < this.cell[0].length; j++) {
                OIP += this.cell[i][j].dx * this.cell[i][j].dy * this.cell[i][j].dz * this.cell[i][j].poro * (1 - this.cell[i][j].Sw)/this.Bo(i, j);
            }
        }
        return Math.trunc(OIP / 5.614583/1000000*100)/100;//in MMSTB
    };
    this.Pavg = function(){
        let sum = 0;
        for(let i = 0; i < this.rows; i++){
            for(let j = 0; j < this.cols; j++){
                sum += this.cell[i][j].p;
            }
        }
        return sum/this.gridblocks;
    };
    this.OOIP = this.calcOIP();
}

//exports.res = res;
exports.Res = Res;
//declare global objects
var socket = io();
var resObj = {};
var wellsObj = [];

function restoreResMethods(res){
    res.getIndex = function(row, col) {
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

    res.Bo = function(i, j) {
        return extrapolate(this.cell[i][j].p, pvt.o[0], pvt.o[1]);
    };

    res.d1_Bo_dPo = function(i, j) {
        let Bo1 = extrapolate(this.cell[i][j].p, pvt.o[0], pvt.o[1]);
        let Bo2 = extrapolate(this.cell[i][j].p + 0.01, pvt.o[0], pvt.o[1]);

        return ((1 / Bo2) - (1 / Bo1)) / 0.01; //dp = 0.01 psi
    };

    res.Bw = function(i, j) {
        return pvt.w[1];
    };

    res.d1_Bw_dPw = function(i, j) {
        return 0;//0.1 * this.d1_Bo_dPo(i, j); //0;
    };

    res.dPcow_dSw = function(i, j) {
        let Pcow1 = extrapolate(this.cell[i][j].Sw, swof[0], swof[3]);
        let Pcow2 = extrapolate(this.cell[i][j].Sw + 0.01, swof[0], swof[3]);
        return (Pcow2 - Pcow1) / 0.01;
    };

    res.visc_o = function(i, j) {
        return extrapolate(this.cell[i][j].p, pvt.o[0], pvt.o[1]);
    };

    res.kro = function(i, j){
        return extrapolate(this.cell[i][j].Sw, swof[0], swof[2]);
    };

    res.krw = function(i, j){
        return extrapolate(this.cell[i][j].Sw, swof[0], swof[1]);
    };

    res.visc_w = function(i, j) {
        return pvt.w[3];
    };

    res.p_cow = function(i, j) {
        if (exists(this.cell, i, j)) {
            return extrapolate(this.cell[i][j].Sw, swof[0], swof[3]);
        } else {
            return 1;
        }
    };

    res.addWells = function(wells) {
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

    res.linearize = function(wells, time) { //linearize reservoir properties from each cell for input to neural net
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

    res.calcOIP = function() {
        let OIP = 0;
        for (let i = 0; i < this.cell.length; i++) {
            for (let j = 0; j < this.cell[0].length; j++) {
                OIP += this.cell[i][j].dx * this.cell[i][j].dy * this.cell[i][j].dz * this.cell[i][j].poro * (1 - this.cell[i][j].Sw)/this.Bo(i, j);
            }
        }
        return Math.trunc(OIP / 5.614583/1000000*100)/100;//in MMSTB
    };

    res.Pavg = function(){
        let sum = 0;
        for(let i = 0; i < this.rows; i++){
            for(let j = 0; j < this.cols; j++){
                sum += this.cell[i][j].p;
            }
        }
        return sum/this.gridblocks;
    };

    res.maxPP = function(){//calculate the maximum productivity potential for use in potential maps
        let maxPP = 0;
        for(let i = 0; i < this.rows; i++){
            for(let j = 0; j < this.cols; j++){
                let PP = this.cell[i][j].kx*this.kro(i, j)*this.cell[i][j].poro*this.cell[i][j].So;
                if(PP > maxPP){
                    maxPP = PP;
                }
            }
        }
        return maxPP;
    };

    res.calcMax = function(){
        let maxkx = 0;
        let maxporo = 0;
        let maxSo = 0;
        for(let i = 0; i < this.rows; i++){
            for(let j = 0; j < this.cols; j++){
                let kx = this.cell[i][j].kx;
                let poro = this.cell[i][j].poro;
                let So = this.cell[i][j].So;
                if(kx > maxkx){
                    maxkx = kx;
                }
                if(poro > maxporo) maxporo = poro;
                if(So > maxSo) maxSo = So;
            }
        }
        this.maxporo = maxporo;
        this.maxkx = maxkx;
        this.maxSo = maxSo;
        return [maxporo, maxkx, maxSo];
    };
}
function drawGrid(res, wells) {
    if (wells == undefined) wells = [];

    let gridblocksX = res.rows;
    let gridblocksY = res.cols;
    let gridSize = $('#main').width() / 2;
    $('#other').css('height', gridSize + 'px');
    let $grid = $('<table id="grid-table" style="border: 1px solid black; margin: 0; padding: 0; width: ' + gridSize + 'px; height: ' + gridSize * gridblocksX / gridblocksY + 'px"></table>');
    let cellSize = 1 / gridblocksY;
    cellSize = cellSize * gridSize;
    let counter = 0;
    for (let i = 0; i < gridblocksX; i++) {
        let $row = $('<tr></tr>');
        for (let j = 0; j < gridblocksY; j++) {
            let $td = $('<td class="cell"></td>');
            $td.attr('id', counter);
            $td.attr('data-x', i);
            $td.attr('data-y', j);
            $td.css('width', cellSize + 'px');
            $td.css('height', cellSize + 'px');
            //$td.css('background', getColorForPercentage(res.cell[i][j].p/res.Pi));
            //$td.css('background', getColorForPercentage(res.cell[i][j].So));
            //$td.css('background', getColorForPercentage(res.cell[i][j].kx));
            //$td.css('background', getColorForPercentage(res.cell[i][j].poro));
            //$td.css('background', getColorForPercentage(res.cell[i][j].kx*res.cell[i][j].So*res.cell[i][j].poro/res.cell[i][j].kx));
            //$td.css('background', getColorForPercentage(res.cell[i][j].kx*res.cell[i][j].So*res.cell[i][j].poro/100));
            //res.calcMax();
            $td.css('background', getColorForPercentage(res.cell[i][j].kx*res.cell[i][j].So*res.cell[i][j].poro/(res.maxporo*res.maxSo*res.maxkx)));
            $row.append($td);
        }
        counter++;
        $grid.append($row);
    }
    $('#map').html($grid);
    drawWells(wells);
}

function drawWells(wells) {
    let $cells = $('.cell');
    for(let n = 0; n < $cells.length; n++){
        let i = $($cells.get(n)).attr('data-x');
        let j = $($cells.get(n)).attr('data-y');
        wells.forEach(function(well){
            if(well.loc.x == i && well.loc.y == j){
                //console.log(i, j);
                $cells.get(n).style.background = '#000';
            }
        });
    }
}

var percentColors = [
    { pct: 0.0, color: { r: 0xff, g: 0x00, b: 0 } },
    { pct: 0.5, color: { r: 0xff, g: 0xff, b: 0 } },
    { pct: 1.0, color: { r: 0x00, g: 0xff, b: 0 } }
];

var getColorForPercentage = function(pct) {
    for (var i = 1; i < percentColors.length - 1; i++) {
        if (pct < percentColors[i].pct) {
            break;
        }
    }
    var lower = percentColors[i - 1];
    var upper = percentColors[i];
    var range = upper.pct - lower.pct;
    var rangePct = (pct - lower.pct) / range;
    var pctLower = 1 - rangePct;
    var pctUpper = rangePct;
    var color = {
        r: Math.floor(lower.color.r * pctLower + upper.color.r * pctUpper),
        g: Math.floor(lower.color.g * pctLower + upper.color.g * pctUpper),
        b: Math.floor(lower.color.b * pctLower + upper.color.b * pctUpper)
    };
    return 'rgb(' + [color.r, color.g, color.b].join(',') + ')';
    // or output as hex if preferred
}

//socket code handlers
socket.on('simulation-result', function(N_o) {
    console.log('N_o', N_o);
});

var chart, data, options;
var chartCount = 0;
google.charts.load('current', {packages: ['corechart', 'line']});
google.charts.setOnLoadCallback(drawCurveTypes);

function drawCurveTypes() {
    data = new google.visualization.DataTable();
    data.addColumn('number', 'X');
    data.addColumn('number', 'simulator');
    //data.addColumn('number', 'ANN');

    //data.addRows([[0,0]]);//[[0, 0, 0],    [1, 10, 5],   [2, 23, 15],  [3, 17, 9],   [4, 18, 10],  [5, 9, 5]]);
    //chartCount++;

    options = {
        hAxis: {
            title: 'Time [days]'
        },
        vAxis: {
            title: 'Production rate [STB/d]'//'Production [STB/d]'
        },
        series: {
            1: {curveType: 'function'}
        }
    };

    chart = new google.visualization.LineChart(document.getElementById('chart'));
    chart.draw(data, options);
}

let startDate;
let endDate;
let startDateANN;
let endDateANN;

//handlers for the controls in UI
$('#simulate-simulator').on('click', function() {
    // console.log('clicked btn');
    // $(this).removeAttr('onclick');
    startDate = new Date();
    //console.log(startDate);
    socket.emit('simulate-simulator', resObj, wellsObj);
});

socket.on('simulate-simulator-final', function(obj, wells) {
    restoreResMethods(obj);
    if(obj.day > 100) return;
    //console.log('res', obj);
    endDate = new Date();
    let time = (endDate.getTime() - startDate.getTime()) / 1000;
    //console.log('time taken: ', time, 's');
    $('#simulate-simulator-text').html((Math.trunc(obj.N_o*100/1e6)/100)+'MMSTB'+' in '+time + 's');
    drawGrid(obj, wells);
    let recovered = 0;
    $('#day').html(obj.day);
    $('#recovered').html(recovered = Math.trunc(obj.N_o/1000000*100)/100);
    $('#remaining').html(Math.trunc((obj.OOIP - recovered)*100)/100);
    $('#rf').html(Math.trunc(recovered/ obj.OOIP*100)/100);
    //$('#pr').html(obj.Pr);
    //console.log('obj ', obj);

    console.log('average pressure', obj.Pavg());
    console.log('Pi', obj.Pi);
    // data.insertRows(chartCount, [[obj.day, 1/(obj.day+10)*20000000]]);//, obj.qo_ + Math.random()*1e4+2.5e5]]);
    // //data.insertRows(chartCount, [[obj.day, obj.qo_]]);
    // chart.draw(data, options);
    // chartCount++;

    //socket.emit('simulate-simulator', obj, wells);
});

$('#simulate-ann').on('click', function(){
    startDateANN = new Date();
    //console.log(startDateANN);
    socket.emit('simulate-ann', resObj, wellsObj);
    console.log('emitted socket')
});

socket.on('simulate-ann-final', function(N_o, wells, res) {
    console.log('res yo', res);
    //res = restoreResMethods(res);
    //res = resObj;
    //if(res.day > 1000) return;
    //console.log('N_o', N_o);
    endDateANN = new Date();
    let time = (endDateANN.getTime() - startDateANN.getTime()) / 1000;
    //console.log('time taken: ', time, 's');
    $('#simulate-ann-text').html((Math.trunc(N_o*100/1e6)/100)+'MMSTB'+' in '+time + 's');
    drawGrid(res, wells);
    let recovered;
    //$('#day').html(res.day);
    $('#recovered').html(recovered = Math.trunc(N_o/1000000*100)/100);
    $('#remaining').html(Math.trunc((res.OOIP - recovered)*100)/100);
    $('#rf').html(Math.trunc(recovered/ res.OOIP*100)/100);
    //console.log('res ', res);
    //socket.emit('simulate-simulator', obj, wells);
});

$('#simulate-all').on('click', function(){
    startDate = new Date();
    startDateANN = new Date();

    socket.emit('simulate-ann', resObj, wellsObj);
    socket.emit('simulate-simulator', resObj, wellsObj);
});

$('body').on('click', '.cell', function(){
    let i = $(this).attr('data-x');
    let j = $(this).attr('data-y');
    console.log('('+i+', '+j+')');
    console.log('cell', resObj.cell[i][j]);
});

setTimeout(function(){
    console.log('requesting reservoirs');
    socket.emit('reservoirs-request', {});
}, 30);

socket.on('reservoirs', function(reservoirs){
    console.log('reservoirs', reservoirs);
    for(let i = 0; i < reservoirs.length; i++){
        restoreResMethods(reservoirs[i]);
        console.log(reservoirs[i].name);
        let $option = $('<option></option>');
        $option.html(reservoirs[i].name+' ('+reservoirs[i].rows+' x '+reservoirs[i].cols+')');
        $option.val(i);
        if(i === 0) {
            drawGrid(reservoirs[i]);
            resObj = reservoirs[i];
            $option.prop('selected', true);
        }
        $('#choose-res').append($option);
    }

    $('#choose-res').on('change', function(){
        //alert(this.value);
        resObj = reservoirs[this.value];
        newRes = reservoirs[this.value];
        drawGrid(resObj);
    });
});

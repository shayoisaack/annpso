//declare global objects
var socket = io();
var resObj = {};
var wellsObj = [];

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
            $td.css('background', getColorForPercentage(res.cell[i][j].p/res.Pi));
            //$td.css('background', getColorForPercentage(res.cell[i][j].So));
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
    console.log($cells.length);
    for(let n = 0; n < $cells.length; n++){
        let i = $($cells.get(n)).attr('data-x');
        let j = $($cells.get(n)).attr('data-y');
        wells.forEach(function(well){
            if(well.loc.x == i && well.loc.y == j){
                console.log(i, j);
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


function modifyRes(res) {
    res.cell[1][3].So = 0.4;
    res.cell[0][2].So = 0.5;
    res.cell[0][3].So = 0.5;
    res.cell[0][4].So = 0.55;
    res.cell[1][2].So = 0.5;
    res.cell[1][4].So = 0.5;
    res.cell[2][2].So = 0.5;
    res.cell[2][3].So = 0.5;
    res.cell[2][4].So = 0.5;
    res.cell[0][1].So = 0.55;
    res.cell[1][1].So = 0.55;
    res.cell[2][1].So = 0.55;
    res.cell[3][2].So = 0.6;
    res.cell[3][3].So = 0.55;
    res.cell[3][4].So = 0.55;
    res.cell[3][1].So = 0.6;
    return res;
}
socket.on('simulation-result', function(N_o) {
    console.log('N_o', N_o);
});

// var ctx = document.getElementById("chart").getContext('2d');
// var myChart = new Chart(ctx, {
//     type: 'line',
//     data: {
//         labels: ["day 0", "day 10", "day 20", "day 30", "day 40", "day 50"],
//         datasets: [{
//             label: 'Cummulative Production (MMSTB)',
//             data: [0, 4, 10, 20, 28, 32],
//             backgroundColor: [
//                 'rgba(255, 99, 132, 0.2)',
//                 'rgba(54, 162, 235, 0.2)',
//                 'rgba(255, 206, 86, 0.2)',
//                 'rgba(75, 192, 192, 0.2)',
//                 'rgba(153, 102, 255, 0.2)',
//                 'rgba(255, 159, 64, 0.2)'
//             ],
//             borderColor: [
//                 'rgba(255,99,132,1)',
//                 'rgba(54, 162, 235, 1)',
//                 'rgba(255, 206, 86, 1)',
//                 'rgba(75, 192, 192, 1)',
//                 'rgba(153, 102, 255, 1)',
//                 'rgba(255, 159, 64, 1)'
//             ],
//             borderWidth: 1
//         }]
//     },
//     options: {
//         scales: {
//             yAxes: [{
//                 ticks: {
//                     beginAtZero: true
//                 }
//             }]
//         }
//     }
// });
//
// var datas = [
//     [0, 0, 0],    [1, 10, 5],   [2, 23, 15],  [3, 17, 9],   [4, 18, 10],  [5, 9, 5],
//     [6, 11, 3],   [7, 27, 19],  [8, 33, 25],  [9, 40, 32],  [10, 32, 24], [11, 35, 27],
//     [12, 30, 22], [13, 40, 32], [14, 42, 34], [15, 47, 39], [16, 44, 36], [17, 48, 40],
//     [18, 52, 44], [19, 54, 46], [20, 42, 34], [21, 55, 47], [22, 56, 48], [23, 57, 49],
//     [24, 60, 52], [25, 50, 42], [26, 52, 44], [27, 51, 43], [28, 49, 41], [29, 53, 45],
//     [30, 55, 47], [31, 60, 52], [32, 61, 53], [33, 59, 51], [34, 62, 54], [35, 65, 57],
//     [36, 62, 54], [37, 58, 50], [38, 55, 47], [39, 61, 53], [40, 64, 56], [41, 65, 57],
//     [42, 63, 55], [43, 66, 58], [44, 67, 59], [45, 69, 61], [46, 69, 61], [47, 70, 62],
//     [48, 72, 64], [49, 68, 60], [50, 66, 58], [51, 65, 57], [52, 67, 59], [53, 70, 62],
//     [54, 71, 63], [55, 72, 64], [56, 73, 65], [57, 75, 67], [58, 70, 62], [59, 68, 60],
//     [60, 64, 56], [61, 60, 52], [62, 65, 57], [63, 67, 59], [64, 68, 60], [65, 69, 61],
//     [66, 70, 62], [67, 72, 64], [68, 75, 67], [69, 80, 72]
// ];
var chart, data, options;
var chartCount = 0;
google.charts.load('current', {packages: ['corechart', 'line']});
google.charts.setOnLoadCallback(drawCurveTypes);

function drawCurveTypes() {
    data = new google.visualization.DataTable();
    data.addColumn('number', 'X');
    data.addColumn('number', 'simulator');
    //data.addColumn('number', 'ANN');

    data.addRows([[0,0]]);//[[0, 0, 0],    [1, 10, 5],   [2, 23, 15],  [3, 17, 9],   [4, 18, 10],  [5, 9, 5]]);
    chartCount++;

    options = {
        hAxis: {
            title: 'Time [days]'
        },
        vAxis: {
            title: 'Production [STB/d]'
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
    console.log(startDate);
    socket.emit('simulate-simulator', resObj, wellsObj);
});

socket.on('simulate-simulator-final', function(obj, wells) {
    if(obj.day > 5000) return;
    console.log('res', obj);
    endDate = new Date();
    let time = (endDate.getTime() - startDate.getTime()) / 1000;
    console.log('time taken: ', time, 's');
    $('#simulate-simulator-text').html((Math.trunc(obj.N_o*100/1e6)/100)+'MMSTB'+' in '+time + 's');
    drawGrid(obj, wells);
    let recovered = 0;
    $('#day').html(obj.day);
    $('#recovered').html(recovered = Math.trunc(obj.N_o/1000000*100)/100);
    $('#remaining').html(Math.trunc((obj.OOIP - recovered)*100)/100);
    $('#rf').html(Math.trunc(recovered/ obj.OOIP*100)/100);
    //$('#pr').html(obj.Pr);
    console.log('obj ', obj);

    data.insertRows(chartCount, [[obj.day, obj.qo_]]);//, obj.qo_ + Math.random()*1e4+2.5e5]]);
    chart.draw(data, options);
    chartCount++;

    socket.emit('simulate-simulator', obj, wells);
});

$('#simulate-ann').on('click', function(){
    startDateANN = new Date();
    console.log(startDateANN);
    socket.emit('simulate-ann', resObj, wellsObj);
    console.log('emitted socket')
});

socket.on('simulate-ann-final', function(N_o, res, wells) {
    if(res.day > 1000) return;
    console.log('N_o', N_o);
    endDateANN = new Date();
    let time = (endDateANN.getTime() - startDateANN.getTime()) / 1000;
    console.log('time taken: ', time, 's');
    $('#simulate-ann-text').html((Math.trunc(N_o*1e11*100/1e6)/100)+'MMSTB'+' in '+time + 's');
    drawGrid(res, wells);
    let recovered;
    //$('#day').html(res.day);
    $('#recovered').html(recovered = Math.trunc(N_o/1000000*100)/100);
    $('#remaining').html(Math.trunc((res.OOIP - recovered)*100)/100);
    $('#rf').html(Math.trunc(recovered/ res.OOIP*100)/100);
    console.log('res ', res);
    //socket.emit('simulate-simulator', obj, wells);
});

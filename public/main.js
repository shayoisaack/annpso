//declare glboal objects
var socket = io();
var resObj = {};
var wellsObj = [];

function drawGrid(res, wells) {
    if (wells == undefined) wells = [];

    var gridblocksX = res.cell.length;
    var gridblocksY = res.cell[0].length;
    var gridSize = $('#main').width() / 2;
    $('#other').css('height', gridSize + 'px');
    var $grid = $('<table id="grid-table" style="border: 1px solid black; margin: 0; padding: 0; width: ' + gridSize + 'px; height: ' + gridSize * gridblocksX / gridblocksY + 'px"></table>');
    var cellSize = 1 / gridblocksY * 100;
    var counter = 0;
    for (var i = 0; i < gridblocksX; i++) {
        $row = $('<tr></tr>');
        for (var j = 0; j < gridblocksY; j++) {
            $td = $('<td></td>');
            $td.attr('id', counter);
            $td.attr('data-x', i);
            $td.attr('data-y', j);
            $td.css('width', cellSize + '%');
            $td.css('height', cellSize + '%');
            //$td.css('background', getColorForPercentage(res.cell[i][j].p/4500));
            $td.css('background', getColorForPercentage(res.cell[i][j].So));
            for (var wi = 0; wi < wells.length; wi++) {
                if (wells[wi].loc.x == i && wells[wi].loc.y == j) {
                    console.log('well here', i, j);
                    $td.css('background', 'rgba(0,0,0)');
                }
            }
            $row.append($td);
        }
        counter++;
        $grid.append($row);
    }
    $('#map').html($grid);
}

function drawWells(wells) {

}

function calcOIP(res) {
    var OIP = 0;
    for (var i = 0; i < res.cell.length; i++) {
        for (var j = 0; j < res.cell[0].length; j++) {
            OIP += res.cell[i][j].dx * res.cell[i][j].dy * res.cell[i][j].dz * res.cell[i][j].poro * (1 - res.cell[i][j].Sw);
        }
    }
    return OIP / 5.614583;
}
//drawGrid(50);

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

socket.on('reservoir', function(res, wells) {
    console.log('res', res);
    console.log('wells', wells)
    resObj = res;
    wellsObj = wells;
    //wellsObj = [{ loc: { x: 1, y: 3 }, p_bh: 3350 }, { loc: { x: 25, y: 25 }, p_bh: 3350 }, { loc: { x: 30, y: 25 }, p_bh: 3350 }];
    //res = modifyRes(res);
    drawGrid(resObj, wellsObj);
    console.log(calcOIP(res), 'bbl');
    $('td').on('click', function(e) {
        $(this).css('background', '#000'); //getColorForPercentage($(this).data('x') / 50));
        var x = $(this).data('x');
        var y = $(this).data('y');
        console.log(x, y);
        // for (var count = 1; count < 10; count++) {
        //     for (var i = 0; i < res.cell.length; i++) {
        //         for (var j = 0; j < res.cell[0].length; j++) {
        //             if ((i == x + count && j < x + 10 && j > x - 10) || (j == y + count && i < x + 10 && i > x - 10)) {
        //                 var item = $('body').find('[data-x="' + i + '"][data-y="' + j + '"]');
        //                 item.css('background', getColorForPercentage(count / 10));
        //                 console.log(item);
        //             }
        //         }
        //     }

        // }
        //socket.emit('chat message', $(this).data('x'));
    })
});

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

var ctx = document.getElementById("chart").getContext('2d');
var myChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: ["day 0", "day 10", "day 20", "day 30", "day 40", "day 50"],
        datasets: [{
            label: 'Cummulative Production (MSTB)',
            data: [0, 4, 10, 20, 28, 32],
            backgroundColor: [
                'rgba(255, 99, 132, 0.2)',
                'rgba(54, 162, 235, 0.2)',
                'rgba(255, 206, 86, 0.2)',
                'rgba(75, 192, 192, 0.2)',
                'rgba(153, 102, 255, 0.2)',
                'rgba(255, 159, 64, 0.2)'
            ],
            borderColor: [
                'rgba(255,99,132,1)',
                'rgba(54, 162, 235, 1)',
                'rgba(255, 206, 86, 1)',
                'rgba(75, 192, 192, 1)',
                'rgba(153, 102, 255, 1)',
                'rgba(255, 159, 64, 1)'
            ],
            borderWidth: 1
        }]
    },
    options: {
        scales: {
            yAxes: [{
                ticks: {
                    beginAtZero: true
                }
            }]
        }
    }
});

var startDate;
var endDate;

//handlers for the controls in UI
$('#simulate-simulator').on('click', function() {
    $(this).removeAttr('onclick');
    startDate = new Date();
    console.log(startDate);
    socket.emit('simulate-simulator', resObj, wellsObj);
});

//socket handlers for receiving from server
socket.on('simulate-simulator-final', function(obj, wells) {
    console.log('res', obj);
    endDate = new Date();
    let time = (endDate.getTime() - startDate.getTime()) / 1000;
    console.log('time taken: ', time, 's');
    $('#simulate-simulator-text').html(time + 's');
    drawGrid(obj, wells);
    $('#day').html(obj.day);
    console.log('obj ', obj);
    socket.emit('simulate-simulator', obj, wells);
});
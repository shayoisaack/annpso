var newRes;
//
// socket.on('reservoir', function(res, wells) {
//     restoreResMethods(res);
//     console.log('res', res);
//     console.log('wells', wells);
//     //resObj = clone(res);
//     newRes = clone(res);
//     wellsObj = wells;
//     //wellsObj = [{ loc: { x: 1, y: 3 }, p_bh: 3350 }, { loc: { x: 25, y: 25 }, p_bh: 3350 }, { loc: { x: 30, y: 25 }, p_bh: 3350 }];
//     //res = modifyRes(res);
//     drawRes(newRes);
//     //ModifyRes(6, 8);
//     console.log(res.OOIP, 'bbl');
//     $('#ooip').html(res.OOIP);
//     // $('td').on('click', function(e) {
//     //     $(this).css('background', '#000'); //getColorForPercentage($(this).data('x') / 50));
//     //     var x = $(this).data('x');
//     //     var y = $(this).data('y');
//     //     console.log(x, y);
//     // })
// });


function drawRes(res, wells) {
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
            $td.css('background', getColorForPercentage(res.cell[i][j].kx*res.cell[i][j].So*res.cell[i][j].poro/100));
            $row.append($td);
        }
        counter++;
        $grid.append($row);
    }
    $('#map').html($grid);
    drawWells(wells);
}

function ModifyRes(a, b, callback){
    let r = $('#brush-radius').html();
    let $cells = $('.cell');
    let count = 0;
    for(let m = r; m >= 0; m--) {
        for (let n = 0; n < $cells.length; n++) {
            let x = $($cells.get(n)).attr('data-x');
            let y = $($cells.get(n)).attr('data-y');
            if (Math.pow(x - a, 2) + Math.pow(y - b, 2) <= Math.pow(m, 2)) {
                callback(x, y, count);
                //$cells.get(n).style.background = getColorForPercentage(count);
                if (m == 0) {
                    $('#edit-poro-text').html(Math.trunc(newRes.cell[x][y].poro * 1000) / 10 + ' %');
                    $('#edit-k-text').html(Math.trunc(newRes.cell[x][y].kx * 10) / 10 + ' md');
                    $('#edit-so-text').html(Math.trunc(newRes.cell[x][y].So * 1000) / 10 + ' %');
                }
            }
        }
        count += 0.002;
    }
}

var callback;
var editNeg = +1;

$('.button.short').on('click', function(){
    $('.button.short').removeClass('select-short');
    $(this).addClass('select-short');

    if($(this).hasClass('neg')){
        editNeg = -1;
    }
    else{
        editNeg = +1;
    }

    switch($(this).attr('data-id')){
        case 'edit-poro':
            callback = function(x, y, count){
                newRes.cell[x][y].poro += 0.1 * count * editNeg;
            };
            break;
        case 'edit-k':
            callback = function(x, y, count){
                newRes.cell[x][y].kx += 20 * count * editNeg;
                newRes.cell[x][y].ky += 20 * count * editNeg;
                newRes.cell[x][y].kz += 20 * count * editNeg;
            };
            break;
        case 'edit-so':
            callback = function(x, y, count){
                newRes.cell[x][y].So += 0.1 * count * editNeg;
                newRes.cell[x][y].Sw = 1 - newRes.cell[x][y].So;
            };
            break;
    }
});

$('body').on('click', '.cell', function(){
    let a = $(this).attr('data-x');
    let b = $(this).attr('data-y');
    ModifyRes(a, b, callback);
    drawGrid(newRes);
});

$('#res-update').on('click', function(){
    let resDetails = {
        rows: $('#edit-rows').val(),
        cols: $('#edit-cols').val(),
        name: $('#edit-name').val()
    };
    console.log(resDetails);
    socket.emit('reservoir-make', resDetails);
});

socket.on('reservoir-make-result', function(res){
    restoreResMethods(res);
    console.log(res);
    newRes = res;
    drawGrid(newRes);
});

$('#reservoir-save').on('click', function(){
    socket.emit('reservoir-save', newRes);
});

socket.on('reservoir-save-done', function(obj){
    console.log('reservoir saved in server');
    $('#reservoir-save-text').html('Saved.');
    setTimeout(function(){
        $('#reservoir-save-text').html('');
    }, 3000);
});


var slider = document.getElementById("myRange");
var output = document.getElementById("brush-radius");
output.innerHTML = slider.value; // Display the default slider value

// Update the current slider value (each time you drag the slider handle)
slider.oninput = function() {
    output.innerHTML = this.value;
};
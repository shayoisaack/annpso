socket.on('reservoir', function(res, wells) {
    console.log('res', res);
    console.log('wells', wells)
    resObj = res;
    wellsObj = wells;
    //wellsObj = [{ loc: { x: 1, y: 3 }, p_bh: 3350 }, { loc: { x: 25, y: 25 }, p_bh: 3350 }, { loc: { x: 30, y: 25 }, p_bh: 3350 }];
    //res = modifyRes(res);
    drawMap(resObj);
    console.log(res.OOIP, 'bbl');
    $('#ooip').html(res.OOIP);
});

function drawMap(res) {
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
            //$td.css('background', getColorForPercentage(res.cell[i][j].p/4500));
            $td.css('background', '#000');
            $td.css('opacity', 0);
            $row.append($td);
            counter++;
        }
        $grid.append($row);
    }
    $('#map').html($grid);
}

$('#draw-map-simulator').on('click', function(){
    for(let i = 0; i < resObj.rows; i++){
        for(let j = 0; j < resObj.cols; j++){
            //$('#'+coorToIndex(i, j, resObj.cols)).css('opacity', 0.1);
            socket.emit('draw-map-simulator', (resObj), i, j);
        }
    }
});

let arr = [];
socket.on('draw-map-simulator-result', function(N_o, i, j){
    arr[coorToIndex(i, j, resObj.cols)] = N_o;
    if(arr.length === resObj.gridblocks) {
        let min = Math.min.apply(null, arr),
            max = Math.max.apply(null, arr);
        for(let x = 0; x < resObj.rows; x++) {
            for(let y = 0; y < resObj.cols; y++) {
                $('#' + coorToIndex(x, y, resObj.cols)).css('opacity', (arr[coorToIndex(x, y, resObj.cols)]-min)/(max-min));
            }
        }
    }
});
$('#draw-map-ann').on('click', function(){
    for(let i = 0; i < resObj.rows; i++){
        for(let j = 0; j < resObj.cols; j++){
            //$('#'+coorToIndex(i, j, resObj.cols)).css('opacity', 0.1);
            socket.emit('draw-map-ann', (resObj), i, j);
        }
    }
});

let arr1 = [];
socket.on('draw-map-ann-result', function(N_o, i, j){
    arr1[coorToIndex(i, j, resObj.cols)] = N_o;
    console.log(arr1.length);
    if(arr1.length === resObj.gridblocks) {
        let min = Math.min.apply(null, arr1),
            max = Math.max.apply(null, arr1);
        for(let x = 0; x < resObj.rows; x++) {
            for(let y = 0; y < resObj.cols; y++) {
                $('#' + coorToIndex(x, y, resObj.cols)).css('opacity', (arr1[coorToIndex(x, y, resObj.cols)]-min)/(max-min));
            }
        }
    }
});

function coorToIndex(i, j, cols){
    return (i*cols)+j;
}
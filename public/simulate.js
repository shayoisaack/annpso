//
// socket.on('reservoir', function(res, wells) {
//     console.log('res', res);
//     console.log('wells', wells)
//     resObj = res;
//     wellsObj = wells;
//     //wellsObj = [{ loc: { x: 1, y: 3 }, p_bh: 3350 }, { loc: { x: 25, y: 25 }, p_bh: 3350 }, { loc: { x: 30, y: 25 }, p_bh: 3350 }];
//     //res = modifyRes(res);
//     drawGrid(resObj, wellsObj);
//     console.log(res.OOIP, 'MMSTB');
//     $('#ooip').html(res.OOIP);
//     // $('td').on('click', function(e) {
//     //     $(this).css('background', '#000'); //getColorForPercentage($(this).data('x') / 50));
//     //     var x = $(this).data('x');
//     //     var y = $(this).data('y');
//     //     console.log(x, y);
//     // })
// });

$('#place-wells-manual').on('click', function(){
    $(this).toggleClass('on');
    $('.cell').toggleClass('place-well');

    if($(this).hasClass('on')){
        wellsObj = [];
    }
});

$('body').on('click', '.place-well', function(){
    let i = $(this).attr('data-x');
    let j = $(this).attr('data-y');

    $(this).css('background', '#000');
    wellsObj.push(new Well(i, j, 'pressure', 3350, 200000, 20000));
});
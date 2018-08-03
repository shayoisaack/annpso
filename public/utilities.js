//pvt properties
var swof = [[0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],//Sw
    [0.00, 0.01, 0.02, 0.03, 0.04, 0.06, 0.19, 0.45, 0.78], //Krw
    [1.00, 0.99, 0.88, 0.67, 0.56, 0.39, 0.16, 0.00, 0.00], //Krow
    [326.2, 168.7, 101.2, 67.4, 52.9, 42.4, 0.00, 0.00, 0.00]]; //Pcow

var pvt = {};
pvt.w = [4014.7, 1.029, 3.13E-6, 0.31, 0]; //Pref, Bw, Cw, ViscW
pvt.o = [[3337.0, 3725.0, 4139.5, 4573.2, 5053.9, 5487.5, 5813.9], //P
    [1.2600, 1.2555, 1.2507, 1.2463, 1.2417, 1.2377, 1.2356], //Bo
    [1.042, 1.072, 1.096, 1.118, 1.151, 1.174, 1.2]]; //ViscO

//functions to evaluate pvt properties
function extrapolate(val, arr1, arr2) {
    var x1, x2, y1, y2;
    var pos = arr1.findIndex(function(element) {
        return val < element;
    });
    if (pos < 1) {
        x1 = arr1[0];
        x2 = arr1[1];
        y1 = arr2[0];
        y2 = arr2[1];
    } else if (pos > arr1.length - 1) {
        x1 = arr1[arr1.length - 2];
        x2 = arr1[arr1.length - 1];
        y1 = arr2[arr2.length - 2];
        y2 = arr2[arr2.length - 1];
    } else {
        x1 = arr1[pos - 1];
        x2 = arr1[pos];
        y1 = arr2[pos - 1];
        y2 = arr2[pos];
    }
    return y1 + (val - x1) * (y1 - y2) / (x1 - x2);
}

function zeros(rows, cols) {
    var arr = [
        []
    ];
    for (var i = 0; i < rows; i++) {
        arr[i] = [];
        for (var j = 0; j < cols; j++) {
            arr[i][j] = 0;
        }
    }
    return arr;
}

function exists(arr, i, j) {
    try {
        if (arr[i][j] == undefined) {
            return false;
        } else {
            return true;
        }
    } catch (e) {
        return false;
    }
}

function Well(x, y, condition, p_bh, qo_, qw_){
    this.loc ={
        x: x,
        y: y
    }
    if(condition === undefined) condition = 'pressure';
    if(p_bh === undefined) p_bh = 3350;
    if(qo_ === undefined) qo_ = 0;
    if(qw_ === undefined) qw_ = 0;
    this.condition = condition;
    this.qo_ = qo_;
    this.qw_ = qw_;
    this.p_bh = p_bh;
}

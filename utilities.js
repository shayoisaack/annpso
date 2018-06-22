var pvt = require('./pvt.js').pvt;
var swof = require('./pvt.js').swof;
var res = require('./res.js').res;

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

exports.extrapolate = extrapolate;
exports.zeros = zeros;
exports.exists = exists;
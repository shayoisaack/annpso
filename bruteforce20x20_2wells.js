const simulateServer = require('./simulator2d-server.js').simulate;
const Well = require('./well.js').Well;
const fs = require('fs');
const restoreResMethods = require('./res2d.js').restoreResMethods;
const clone = require('clone');

let resObj = fs.readFileSync('reservoirs/Hetero 3.json', 'utf8');
resObj = JSON.parse(resObj);
restoreResMethods(resObj);

const timesteps = 1;

let startDate = new Date();
let Nbest = 0;
let wellsBest = [];
for(let i1 = 0; i1 < resObj.rows; i1++){
    for(let j1 = 0; j1 < resObj.cols; j1++){
        for(let i2 = 0; i2 < resObj.rows; i2++){
            for(let j2 = 0; j2 < resObj.cols; j2++){
                if((i1 === i2 && j1 === j2)) continue;// || (i1 === i3 && j1 === j3) || (i2 === i3 && j2 === j3) || (i1 === i2 === i3 && j1 === j2 === j3)) continue;

                console.log('testing: ('+i1+','+j1+'), ('+i2+','+j2+')');
                let wells = [new Well(i1, j1, 'pressure', 3350, 200000, 20000), new Well(i2, j2, 'pressure', 3350, 200000, 20000)];//, new Well(i3, j3, 'pressure', 3350, 200000, 20000)];
                let N = simulateServer(clone(resObj), wells, timesteps);
                if(N > Nbest){
                    Nbest = N;
                    wellsBest = wells;
                }
            }

        }
    }
}

let endDate = new Date();
let timeTaken = (endDate.getTime() - startDate.getTime())/1000/60;
console.log('time taken:', timeTaken, 'minutes');
console.log("Nbest: ", Nbest);
console.log('wellsBest: ', wellsBest);
console.log('20x20 2 wells');
let Particle = function(x, y){
    this.x = x;
    this.y = y;
    this.pBest = - Infinity;
    this.vx = Array(x.length).fill(0);
    this.vy = Array(y.length).fill(0);
    this.pBestVal = {};
    this.makeWells = function(){
        let wells = [];
        for(let i = 0; i < this.x.length; i++){
            wells.push({condition: 'pressure', loc: {x: this.x[i], y: this.y[i]}, p_bh: 3350, qo_: 200000, qw_: 20000});
        }
        return wells;
    }
};

let PSO = function (){
    this.particles = [];
    this.gBest = - Infinity;
    this.gBestVal = null;
    this.gBestParticle = {};
    this.numParticles = 0;
    this.social = 0.1;
    this.personal = 0.2;

    this.setObjective = function(objectiveFunction, res, timesteps){
        this.objectiveFunction = objectiveFunction;
        this.res = res;
        this.timesteps = timesteps;
    };
    this.init = function(numParticles, maxX, maxY, numWells){
        this.numWells = numWells;
        for(let i = 0; i < numParticles; i++){
            let x = [];
            let y = [];
            for(let j = 0; j < numWells; j++) {
                x.push(Math.floor(Math.random() * maxX));
                y.push(Math.floor(Math.random() * maxY));
            }
            //console.log(x, y);
            this.particles.push(new Particle(x, y));
        }
        this.particles.forEach(function(particle){
            //console.log(particle.makeWells());
        });
        this.numParticles = numParticles;
        let x = Array(numWells).fill(0);;
        let y = Array(numWells).fill(0);
        this.gBestVal = {
            x: x,
            y: y
        };
        //console.log(this.particles);
        return this.particles;
    };
    this.step = function(res, timesteps, objectiveFunction){
        let gBest = this.gBest;
        let gBestVal = this.gBestVal;
        let gBestParticle = this.gBestParticle;
        let social = this.social;
        let personal = this.personal;
        this.particles.forEach(function(particle){
            //find fitness of particle and assign it
            //console.log(particle.x, particle.y);
            //console.log('res', res);
            //console.log('timesteps', timesteps);
            //console.log(particle.makeWells());

            particle.fitness = objectiveFunction(res, particle.makeWells(), timesteps);
            console.log('particle fitness: ', particle.fitness);

            if(particle.fitness > particle.pBest){
                particle.pBest = particle.fitness;
                particle.pBestVal = {
                    x: particle.x,
                    y: particle.y
                };
            }
            //console.log('printing gBest', gBest);
            if(particle.fitness > gBest){
                gBest = particle.fitness;
                gBestVal.x = particle.x;
                gBestVal.y = particle.y;
                gBestParticle = particle;
            }
            //console.log(particle.pBest, particle.pBestVal);
            //console.log(gBest, gBestVal);
            //compute velocity and move particle
            for(let i = 0; i < particle.x.length; i++) {
                particle.vx[i] = particle.vx[i] + 2 * personal*Math.random() * (particle.pBestVal.x[i] - particle.x[i]) + 2 *social* Math.random() * (gBestVal.x[i] - particle.x[i]);
                particle.vy[i] = particle.vy[i] + 2 * personal*Math.random() * (particle.pBestVal.y[i] - particle.y[i]) + 2 *social* Math.random() * (gBestVal.y[i] - particle.y[i]);

                particle.x[i] = Math.floor(particle.x[i] + particle.vx[i]);
                particle.y[i] = Math.floor(particle.y[i] + particle.vy[i]);

                console.log(particle.vx[i], particle.vy[i]);

                if (particle.x[i] < 0) {
                    particle.x[i] = 0;
                }
                if (particle.y[i] < 0) {
                    particle.y[i] = 0;
                }
                if (particle.x[i] > res.rows - 1) {
                    particle.x[i] = res.rows - 1;
                }
                if (particle.y[i] > res.cols - 1) {
                    particle.y[i] = res.cols - 1;
                }
            }
        });
        this.gBest = gBest;
        this.gBestVal = gBestVal;
        this.gBestParticle = gBestParticle;
    };

    this.printParticles = function(){
        this.particles.forEach(function(particle){
            console.log('print', particle);
        });
    };
    this.reset = function(){
        this.particles = [];
        this.gBest = - Infinity;
        this.gBestVal = null;

    };

    this.getBestWellPattern = function(){
        return this.gBestParticle.makeWells();
    }
};

exports.PSO = PSO;
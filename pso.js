let Particle = function(x, y){
    this.x = x;
    this.y = y;
    this.pBest = - Infinity;
    this.vx = 0;
    this.vy = 0;
    this.pBestVal = {};
};

let PSO = function (){
    this.particles = [];
    this.gBest = - Infinity;
    this.gBestVal = null;
    this.numParticles = 0;
    this.setObjective = function(objectiveFunction, res, timesteps){
        this.objectiveFunction = objectiveFunction;
        this.res = res;
        this.timesteps = timesteps;
    };
    this.init = function(numParticles, maxX, maxY){
        for(let i = 0; i < numParticles; i++){
            let randX = Math.floor(Math.random()*maxX);
            let randY = Math.floor(Math.random()*maxY);
            this.particles.push(new Particle(randX, randY));
        }
        this.numParticles = numParticles;
        return this.particles;
    };
    // this.findFitness = function(particle){
    //     return this.objectiveFunction(this.res, [{loc: {x: particle.x, y: particle.y}}], this.timesteps);
    // };
    this.step = function(res, timesteps, objectiveFunction){
        let gBest = - Infinity;
        let gBestVal = {

        };
        this.particles.forEach(function(particle){
            //find fitness of particle and assign it
            //console.log(particle.x, particle.y);
            //console.log('res', res);
            //console.log('timesteps', timesteps);
            particle.fitness = objectiveFunction(res, [{condition: 'pressure', loc: {x: particle.x, y: particle.y}, qo_: 200, qw_: 20}], timesteps);
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
            }

            //compute velocity and move particle
            particle.vx = particle.vx + 2*Math.random()*(particle.pBestVal.x - particle.x)+2*Math.random()*(gBestVal.x - particle.x);
            particle.vy = particle.vy + 2*Math.random()*(particle.pBestVal.y - particle.y)+2*Math.random()*(gBestVal.y - particle.y);

            particle.x = Math.floor(particle.x + particle.vx);
            particle.y = Math.floor(particle.y + particle.vy);

            if(particle.x < 0){
                particle.x = 0;
            }
            if(particle.y < 0){
                particle.y = 0;
            }
            if(particle.x > res.rows - 1){
                particle.x = res.rows - 1;
            }
            if(particle.y > res.cols - 1){
                particle.y = res.cols - 1;
            }
        });
        this.gBest = gBest;
        this.gBestVal = gBestVal;
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
};

exports.PSO = PSO;
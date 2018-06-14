var res = {};
res.cell = [];
for(var i = 0; i < 20; i++){
	res.cell[i] = new Cell(4500, 0.3, 100, 1000);
}

function Cell(p, poro, perm, dx){
	this.p = p;
	this.poro = poro;
	this.kx = perm;
	this.ky = perm;
	this.kz = 20; //md
	this.qo_ = 0;
	this.qw_ = 0;
	this.dx = dx; //ft
	this.dy = dx;
	this.dz = 50;
	this.Sw = 0.3;
	this.So = 1 - this.Sw;
}

function Res(gridblocks){
	var res = {};
	res.cell = [];
	for(var i = 0; i < gridblocks; i++){
		res.cell[i] = new Cell(4500, 0.3, 100, 1000);
	}
	return res;
}

exports.res = res;
exports.Res = Res;
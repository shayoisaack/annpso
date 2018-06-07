var gauss = require('./gaussian-elimination-master/gauss.js');
//console.log(gauss([[1, 2], [2, 3]], [4, 5]));

var res = {};
res.cell = [];
for(var i = 0; i < 10; i++){
	res.cell[i] = new Cell(4500, 0.3, 100, 1000);
}

//some constants
var dt = 1;// timestep is 1 day

//console.log(res);

function Cell(p, poro, perm, dx){
	this.p = p;
	this.poro = poro;
	this.kx = perm;
	this.ky = perm;
	this.kz = 20; //md
	this.qo_ = 0;
	this.qw_ = 0;
	this.dx = dx; //ft
}

//pvt properties
var swof = 

//functions to evaluate pvt properties
var Sw = function(){

}

//set wells
res.cell[5].qo_ = 2000;//one well at cell 5 producing 2000 stb/day

var A = [];
var d = [];
//generate sparse matrix
for(var i = 0; i< res.cell.length; i++){
	var a, b, c, d;
	var Txo_neg, Txo_pos, Txw_neg, Txw_pos;
	var Csww, Cswo;
	var alpha;

	Cpoo = res.cell[i].poro*(1 - Sw(i))/dt*(cr/Bo(i) + d1_Bo_dPo(i));
	Cswo = - res.cell[i].poro/Bo(i)/dt;
	Cpow = res.cell[i].poro*Sw(i)/dt*(cr/Bw(i) d1_Bw_dPw(i));
	Csww = res.cell[i].poro/Bw(i)/dt - dP_cow_dSw(i)*Cpow;

	lambda_o_pos = (res.cell[i+1].p >= res.cell[i].p)?res.cell[i+1].kx/visc_o(i+1)/Bo(i+1):res.cell[i].kx/visc_o(i)/Bo(i);
	lambda_o_neg = (res.cell[i-1].p) >= res.cell[i].p?res.cell[i-1].kx/visc_o(i-1)/Bo(i-1):res.cell[i].kx/visc_o(i)/Bo(i);
	lambda_w_pos = (res.cell[i+1].p >= res.cell[i].p)?res.cell[i+1].kx/visc_w(i+1)/Bw(i+1):res.cell[i].kx/visc_w(i)/Bw(i);
	lambda_w_neg = (res.cell[i-1].p) >= res.cell[i].p?res.cell[i-1].kx/visc_w(i-1)/Bw(i-1):res.cell[i].kx/visc_w(i)/Bw(i);


	Txo_pos = 2*lambda_o_pos/res.cell[i].dx/(res.cell[i+1].dx/res.cell[i+1].kx + res.cell[i].dx/res.cell[i].kx);
	Txo_neg = 2*lambda_o_neg/res.cell[i].dx/(res.cell[i-1].dx/res.cell[i-1].kx + res.cell[i].dx/res.cell[i].kx);
	Txw_pos = 2*lambda_w_pos/res.cell[i].dx/(res.cell[i+1].dx/res.cell[i+1].kx + res.cell[i].dx/res.cell[i].kx);
	Txw_neg = 2*lambda_w_neg/res.cell[i].dx/(res.cell[i-1].dx/res.cell[i-1].kx + res.cell[i].dx/res.cell[i].kx);

	alpha = -Csww/Cswo;

	a = Txo_neg + alpha*Txw_neg;
	c = Txo_pos + alpha*Txw_pos;
	b = -(Txo_pos + Txo_neg + Cpoo) - alpha*(Txw_pos + Txw_neg + Cpow);
	d = -(Cpoo + alpha*Cpow)*res.cell[i].p + res.cell[i].qo_ + alpha*res.cell[i].qw_ + alpha*Txw_pos*(p_cow(i+1) - pcow(i)) + alpha*Txw_neg*(p_cow(i-1) - p_cow(i));

	var row =[];
	for(var j = 0; j < res.cell.length; j++){
		if(i == j -1)
			row[j] = a;
		else if(i == j)
			row[j] = b;
		else if(i == j+1)
			row[j] = c;
		else
			row[j] = 0;
	}

	A[i] = row;
	d[i] = d;
}
//end generate sparse matrix
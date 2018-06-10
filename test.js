
function Cell(p, poro, perm, dx){
	this.p = p;
	this.poro = poro;
	this.kx = perm;
	this.ky = perm;
	this.kz = 20; //md
	this.qo_ = 0;
	this.qw_ = 0;
	this.dx = dx; //ft
	this.Sw = 0.3;
	 Object.defineProperties(this, {
        "So": {
             "get": function() { 
             	return 1 - this.Sw;
             },
             "set": function() { }
        }
    });
}

var cell = new Cell(4500, 0.3, 100, 1000);
console.log(cell);
cell.Sw = 0.4;
console.log(cell);

// var o = {
//   a: 7,
//   get b() { 
//     return this.a + 1;
//   },
//   set c(x) {
//     this.a = x / 2;
//   }
// };

// console.log(o.a); // 7
// console.log(o.b); // 8
// o.c = 50;
// console.log(o.a); // 25
// console.log(o);
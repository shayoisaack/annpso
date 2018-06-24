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

exports.Well = Well;

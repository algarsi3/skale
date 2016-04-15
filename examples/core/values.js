#!/usr/bin/env node

var sc = require('skale-engine').context();

sc.parallelize([[1,2],[2,4],[4,6]])
  .values()
  .collect()
  .toArray(function(err, res) {
	console.log(res);
	res.sort();
	console.assert(JSON.stringify(res) === JSON.stringify([2,4,6]));	  
	sc.end();
});
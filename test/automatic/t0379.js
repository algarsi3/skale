#!/usr/local/bin/node --harmony

console.log("\n" + "# parallelize persist parallelize rightOuterJoin collect");

var co = require('co');
var fs = require('fs');
var ugrid = require('../../');
var ut = require('../ugrid-test.js');

co(function *() {
	var uc = yield ugrid.context();
	console.assert(uc.worker.length > 0);

	var raw_data = [
		fs.readFileSync('/tmp/kv.data', {encoding: 'utf8'}), 
		fs.readFileSync('/tmp/kv2.data', {encoding: 'utf8'})
	];
	fs.writeFileSync("/tmp/v0", raw_data[0]);
	fs.writeFileSync("/tmp/v1", raw_data[1]);	

	var v = [
		raw_data[0].split('\n').map(function(s) {return s.split(' ').map(parseFloat)}),
		raw_data[1].split('\n').map(function(s) {return s.split(' ').map(parseFloat)})
	];

	var v_ref = [
		JSON.parse(JSON.stringify(v[0])),
		JSON.parse(JSON.stringify(v[1]))
	]

	var dsource = [], lsource = [];

	var frac = 0.1;
	var seed = 1;
	var withReplacement = true;
	var key = v_ref[0][0][0];

	function reducer(a, b) {
		a[0] += b[0];
		if (Array.isArray(b[1]) == false) {
			a[1] += b[1];
		} else {
			a[1] += b[1].reduce(function (a, b) {return a + b});
		}
		return a;
	}

	function mapper(e) {
		e[1] *= 2;
		return e;
	}

	function filter(e) {return (e[1] % 2 == 0);}

	function flatMapper(e) {return [e, e];}

	function valueMapper(e) {return e * 2;}

	function reducerByKey(a, b) {
		a += b;
		return a;
	}

	function valueFlatMapper(e) {
		var out = [];
		for (var i = e; i <= 5; i++)
			out.push(i);
		return out;
	}

	lsource[0] = v_ref[0];
	lsource[1] = v_ref[1];
	lsource[1] = ut.join(lsource[1], lsource[0], "right");
	var loc = lsource[1];
	
	dsource[0] = uc.parallelize(v[0]);
	dsource[0] = dsource[0].persist();
	yield dsource[0].count();
	v[0].push([v_ref[0][0][0], v_ref[0][0][1]]);
	dsource[1] = uc.parallelize(v[1]);
	dsource[1] = dsource[1].rightOuterJoin(dsource[0]);
	var dist = yield dsource[1].collect();
	
	console.log('=> Local result')
	console.log(loc);
	console.log('=> Distributed result')
	console.log(dist);

	if (Array.isArray(dist)) {
		dist.sort();
		for (var i = 0; i < dist.length; i++) {
			if (Array.isArray(dist[i][1]))
				dist[i][1].sort();
		}
	}

	if (Array.isArray(loc)) {
		loc.sort();
		for (var i = 0; i < loc.length; i++) {
			if (Array.isArray(loc[i][1]))
				loc[i][1].sort();
		}
	}

	console.assert(JSON.stringify(dist) == JSON.stringify(loc));

	uc.end();
}).catch(ugrid.onError);


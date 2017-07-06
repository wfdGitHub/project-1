
module.exports.dispatch = function(uid, connectors) {
	var index = Math.abs(parseInt(uid)) % connectors.length;
	console.log("uid : "+uid)
	console.log("index : "+index)
	return connectors[index];
};
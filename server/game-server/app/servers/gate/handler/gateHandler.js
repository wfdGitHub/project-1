var dispatcher = require('../../../util/dispatcher');

module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
	this.app = app;
};

var handler = Handler.prototype;

/**
 * Gate handler that dispatch user to connectors.
 *
 * @param {Object} msg message from client
 * @param {Object} session
 * @param {Function} next next stemp callback
 *
 */
var index = 0
handler.queryEntry = function(msg, session, next) {
	// get all connectors
	var connectors = this.app.getServersByType('connector');
	if(!connectors || connectors.length === 0) {
		next(null, {
			code: 500
		});
		return;
	}
	index++;
	if(index >= connectors.length){
		index = 0
	}
	var res = connectors[index % connectors.length]
	next(null, {
		code: 200,
		host: res.host,
		port: res.clientPort
	});
};

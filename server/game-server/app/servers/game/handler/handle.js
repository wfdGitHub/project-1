module.exports = function(app) {
	return new GameHandler(app);
};

var GameHandler = function(app) {
	this.app = app;

};

var handler = GameHandler.prototype;

handler.send = function(msg, session, next) {
	console.log("end");
	next(null,msg);
};
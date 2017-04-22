module.exports = function(app) {
	return new remote(app);
};

var remote = function(app) {
	this.app = app;
	// this.channelService = app.get('channelService');
};



remote.prototype.checkUser = function checkUser(account,password,cb) {
	if(account == 1 && password == 1){
		cb(true)
	}else{
		cb(false)
	}
}
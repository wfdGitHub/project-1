module.exports = function(app) {
	return new ConnectorRemote(app);
};

var ConnectorRemote = function(app) {
	this.app = app
    ConnectorRemote.channelService = this.app.get('channelService');
}	


var remote = ConnectorRemote.prototype

remote.sendByUid = function(uid,notify,cb) {
	//console.log("uid : "+uid)
	//console.log(notify)
	ConnectorRemote.channelService.pushMessageByUids('onMessage', notify, [{
      uid: uid,
      sid: this.app.get('serverId')
    }]);  
    if(cb){
    	cb()
    }
}
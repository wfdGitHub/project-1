module.exports = function(app) {
	return new ConnectorRemote(app);
};

var ConnectorRemote = function(app) {
	this.app = app
  ConnectorRemote.channelService = this.app.get('channelService');
}	


var remote = ConnectorRemote.prototype

remote.sendByUid = function(params,uid,notify,cb) {
	ConnectorRemote.channelService.pushMessageByUids('onMessage', notify, [{
      uid: uid,
      sid: this.app.get('serverId')
    }])
    if(cb){
    	cb() 
    }
}


//通知公告更新
remote.broadcast = function(notify) {
  ConnectorRemote.channelService.broadcast()
}

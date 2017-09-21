module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
	this.app = app
	Handler.app = app
};

var handler = Handler.prototype

//生成红包
handler.createRedPacket = function(msg,session,next) {
	var uid = session.get("uid")
	var diamond = msg.diamond
    if(!uid || !diamond || typeof(diamond) != "number" || diamond < 0){
      next(null,false)
    }else{
		this.app.rpc.game.redPacketServer.createRedPacket(null,uid,diamond,function(data) {
			next(null,data)
		})
    }
}

//查询红包
handler.queryRedPacket = function(msg,session,next) {
	var uid = session.get("uid")
	var redId = msg.redId
    if(!uid || !redId){
      next(null,false)
    }else{
		this.app.rpc.game.redPacketServer.queryRedPacket(null,redId,function(data) {
			next(null,data)
		})
    }

}


//领取红包
handler.drawRedPacket = function(msg,session,next) {
	var uid = session.get("uid")
	var redId = msg.redId
    if(!uid || !redId){
      next(null,{"flag" : false})
    }else{
		this.app.rpc.game.redPacketServer.drawRedPacket(null,uid,redId,function(data) {
			next(null,data)
		})    	
    }
}

//查询个人红包记录
handler.queryUserRed = function(msg,session,next) {
	var uid = session.get("uid")
    if(!uid){
      next(null,{"flag" : false})
    }else{
		this.app.rpc.game.redPacketServer.queryUserRed(null,uid,function(data) {
			next(null,data)
		})
    }
}
var async = require("async")


module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
	this.app = app
	Handler.app = app
};

//监控模块
var handler = Handler.prototype

//用户列表
handler.onlineUser = function(msg,session,next) {
  var sessionService = this.app.get('sessionService') 
  var uidmap = sessionService.service.uidMap;
    var allUserIds = Object.keys(uidmap);
    var uidInfos = new Array();
    for(var i =0;i < allUserIds.length; i++)
    {
        var uid = allUserIds[i];
        var infos = uidmap[uid];
        var uidInfo =
        {
            uid:infos[0].uid,
            nickname:infos[0].get("nickname")
        };
        uidInfos.push(uidInfo);
    }
  next(null,uidInfos)
}
//获取代开房数据
handler.getAgencyList = function(msg,session,next) {
	this.app.rpc.game.monitor.getAgencyList(session,function(data) {
		//console.log(data)
		next(null,data)
	})	
}

//房间列表
handler.roomInfos = function(msg,session,next) {
	this.app.rpc.game.monitor.roomInfos(session,function(data) {
		//console.log(data)
		next(null,data)
	})
}

//结束单个房间
handler.finishRoom = function(msg,session,next) {
	this.app.rpc.game.monitor.finishRoom(session,msg.roomId,function() {
		next(null)
	})	
}

//结束全部房间
handler.finishAllRoom = function(msg,session,next) {
	this.app.rpc.game.monitor.finishAllRoom(session,function(data) {
		next(null,data)
	})	
}

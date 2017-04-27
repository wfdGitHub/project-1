//var gameHandle = require('../handler/handle');
var NiuNiu = require("../../../games/NiuNiu.js")
module.exports = function(app) {
	return new GameRemote(app);
};


var GameRemote = function(app) {
	this.app = app;
	GameRemote.channelService = app.get('channelService');
	//初始化房间
	for(var i = 1;i < 2;i++){
		GameRemote.roomList[i] = NiuNiu.createRoom(i,GameRemote.channelService,roomCallback)
	}
	console.log(this.app.get('serverId'))
};
//房间回调
var roomCallback = function(roomId) {
	console.log("room end "+ roomId)
}
//房间列表
GameRemote.roomList = new Array(100);
//房间状态
GameRemote.roomState = new Array(100);
//用户房间映射表
GameRemote.userMap = {}		


GameRemote.prototype.receive = function(uid, sid,code,params,cb) {
	console.log("code : "+code)
	//加入房间需要用户不在房间内
	if(code == "join"){
		if(!GameRemote.userMap[uid]){
			var roomId = 1
			GameRemote.roomList[roomId].join(uid,sid,null,function (flag) {
				if(flag === true){
					GameRemote.userMap[uid] = roomId;
				}
				cb(flag)
			})
		}else{
			var roomId = GameRemote.userMap[uid]
			GameRemote.roomList[roomId].reconnection(uid,sid,null,function(flag) {
				cb(flag)
			})
			
		}		
	}else{
		//用户存在房间内时才执行
		console.log("user id : " + GameRemote.userMap[uid])
		if(!!GameRemote.userMap[uid]){
			var roomId = GameRemote.userMap[uid];
			if(roomId != undefined && GameRemote.roomList[roomId][code] != undefined){
			    GameRemote.roomList[roomId][code](uid,sid,params,cb)
			}else{
			    cb(false)
			}
		}
		else{
			cb(false)
		}
	}

};


GameRemote.prototype.kick = function(uid,cb) {
	console.log("user leave1 : "+uid)
	if(GameRemote.userMap[uid]){
		var roomId = GameRemote.userMap[uid]
		GameRemote.roomList[roomId].leave(uid)
	}
};

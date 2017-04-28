//var gameHandle = require('../handler/handle');
module.exports = function(app) {
	return new GameRemote(app);
};

var GameRemote = function(app) {
	this.app = app;
	GameRemote.niuniuService = this.app.get("NiuNiuService")
	//console.log(this.niuniuService)
};


GameRemote.prototype.receive = function(uid, sid,code,params,cb) {
	console.log("code : "+code)
	//加入房间需要用户不在房间内
	if(code == "join"){
		if(!GameRemote.niuniuService.userMap[uid]){
			var roomId = 1
			GameRemote.niuniuService.roomList[roomId].join(uid,sid,null,function (flag) {
				if(flag === true){
					GameRemote.niuniuService.userMap[uid] = roomId;
				}
				cb(flag)
			})
		}else{
			var roomId = GameRemote.niuniuService.userMap[uid]
			GameRemote.niuniuService.roomList[roomId].reconnection(uid,sid,null,function(flag) {
				cb(flag)
			})
			
		}		
	}else{
		//用户存在房间内时才执行
		console.log("room id : " + GameRemote.niuniuService.userMap[uid])
		if(!!GameRemote.niuniuService.userMap[uid]){
			var roomId = GameRemote.niuniuService.userMap[uid];
			if(roomId != undefined && GameRemote.niuniuService.roomList[roomId][code] != undefined){
			    GameRemote.niuniuService.roomList[roomId][code](uid,sid,params,cb)
			    cb(true)
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
	if(GameRemote.niuniuService.userMap[uid]){
		var roomId = GameRemote.niuniuService.userMap[uid]
		GameRemote.niuniuService.roomList[roomId].leave(uid)
	}
};

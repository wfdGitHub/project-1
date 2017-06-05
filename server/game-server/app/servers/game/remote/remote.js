//var gameHandle = require('../handler/handle');
var conf = require("../../../conf/niuniuConf.js").niuConf
var async = require("async")
//console.log(conf)
module.exports = function(app) {
	return new GameRemote(app);
};

var GameRemote = function(app) {
	this.app = app
	GameRemote.app = app
	GameRemote.niuniuService = this.app.get("NiuNiuService")
};


GameRemote.prototype.receive = function(uid, sid,code,params,cb) {
	var self = this
	console.log("code : "+code)
	//加入房间需要用户不在房间内
	if(code == "join"){
		if(!GameRemote.niuniuService.userMap[uid]){
			//TODO  无效条件判断
			if(typeof(params.roomId) != "number" || params.roomId < 0 || !GameRemote.niuniuService.roomList[params.roomId]){
				console.log("params.roomId : "+params.roomId)
				console.log("type : "+typeof(params.roomId))
				console.log(GameRemote.niuniuService.roomList[roomId])
				cb(false)
				return
			}
			async.waterfall([
				function(next) {
					//获取玩家钻石，判断是否满足准入数额
					self.app.rpc.db.remote.getValue(null,uid,"diamond",function(data){
						next(null,data)
					})
				},
				function(data) {
					var roomId = params.roomId
					var diamond = data
					var needMond = 0
					switch(GameRemote.niuniuService.roomList[roomId].consumeMode){
						case conf.MODE_DIAMOND_HOST : 
							needMond = 0
						break;
						case conf.MODE_DIAMOND_EVERY :
							needMond = GameRemote.niuniuService.roomList[roomId].needDiamond
						break;
						case conf.MODE_DIAMOND_WIN : 
							needMond = GameRemote.niuniuService.roomList[roomId].needDiamond * conf.GAME_PLAYER;
						break;
					} 
					if(diamond >= needMond){
						var ip = params.ip;
						GameRemote.niuniuService.roomList[roomId].join(uid,sid,{ip : ip},function (flag) {
							if(flag === true){
								GameRemote.niuniuService.userMap[uid] = roomId;
							}
							cb(flag)
						})
					}else{
						cb(false)
					}
					return
				}
			],function(err,result) {
				console.log(err)
				console.log(result)
				cb(false)
				return
			})
		}else{
			var roomId = GameRemote.niuniuService.userMap[uid]
			GameRemote.niuniuService.roomList[roomId].reconnection(uid,sid,null,function(flag) {
				cb(flag)
			})
			return
		}		
	}else if(code == "newRoom"){
		//TODO  无效数据判断
		if(!params.playerAmount || typeof(params.playerAmount) !== "number" || params.playerAmount < 2 || params.playerAmount > 6){
	      log("newRoom error   param.playerAmount : "+params.playerAmount)
	      cb(false)
	      return
	    }
	  async.waterfall([
			function(next) {
				//获取玩家钻石，判断是否满足准入数额
				self.app.rpc.db.remote.getValue(null,uid,"diamond",function(data){
					next(null,data)
				})
			}, 
			function(data) {
				var diamond = data
				var needMond = Math.ceil(params.gameNumber / 10)
				switch(params.consumeMode){
					case conf.MODE_DIAMOND_HOST : 
						needMond = needMond * params.playerAmount
					break;
					case conf.MODE_DIAMOND_EVERY :
						needMond = needMond
					break;
					case conf.MODE_DIAMOND_WIN : 
						needMond = needMond * params.playerAmount
					break;
				}
				if(diamond >= needMond){
					//用户不存在于房间内，且房间未开启
					var roomId = GameRemote.niuniuService.getUnusedRoom()
					if(roomId !== false){		
						if(!GameRemote.niuniuService.userMap[uid]){
							//找到空闲房间ID
								GameRemote.niuniuService.roomList[roomId].newRoom(uid,sid,params,function (flag) {
									if(flag === true){
										GameRemote.niuniuService.userMap[uid] = roomId;
										GameRemote.niuniuService.roomState[roomId] = false;
									}
									cb(flag)
								})
						}else{
							cb(false)
						}
					}else{
						cb(false)
					}
				}
				return
			}
	  	], function (err, result) {
			console.log(err)
			console.log(result)
			cb(false)
			return
	  });
	}else{
		//用户存在房间内时才执行
		console.log("room id : " + GameRemote.niuniuService.userMap[uid])
		if(GameRemote.niuniuService.userMap[uid] !== undefined){
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
	console.log("user leave : "+uid)
	if(GameRemote.niuniuService.userMap[uid] != undefined){
		var roomId = GameRemote.niuniuService.userMap[uid]
		GameRemote.niuniuService.roomList[roomId].leave(uid)
	}
	if(cb){
		cb()
	}
};

//检测是否需要重连
GameRemote.prototype.reconnection = function(uid, sid,cb) {
	if(GameRemote.niuniuService.userMap[uid] !== undefined){
		var roomId = GameRemote.niuniuService.userMap[uid]
		GameRemote.niuniuService.roomList[roomId]["reconnection"](uid,sid,null,cb)
	}else{
		cb()
	}
}
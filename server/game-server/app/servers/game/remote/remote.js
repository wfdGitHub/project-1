//var gameHandle = require('../handler/handle');
var conf = require("../../../conf/niuniuConf.js").niuConf
var tips = require("../../../conf/tips.js").tipsConf
var async = require("async")
var openRoomLogger = require("pomelo-logger").getLogger("openRoom-log");
var freeFrame = require("freeFrame.js")
//console.log(conf)
module.exports = function(app) {
	return new GameRemote(app);
};
var local = {}
var GameRemote = function(app) {
	this.app = app
	GameRemote.app = app
	GameRemote.GameService = this.app.get("GameService")
	freeFrame.start(GameRemote.GameService)
};


//获取代开房数据
GameRemote.prototype.getAgencyRoom = function(uid,cb) {
	var data = GameRemote.GameService.getAgencyRoom(uid)
	if(cb){
		cb(data)
	}
}

GameRemote.prototype.onFrame = freeFrame.onFrame


GameRemote.prototype.receive = function(uid, sid,code,params,cb) {
	//console.log("uid : "+uid+"code : "+code)
	//房间已锁定则拒绝操作
	if(GameRemote.GameService.userMap[uid]){
		var roomId = GameRemote.GameService.userMap[uid]
		if(GameRemote.GameService.roomLock[roomId] == false){
			cb(false)
			return
		}
	}

	var self = this
	//加入房间需要用户不在房间内
	if(code == "join"){
		if(!GameRemote.GameService.userMap[uid]){
			//无效条件判断
			if(typeof(params.roomId) != "number" || params.roomId < 0 
				|| !GameRemote.GameService.roomList[params.roomId] || GameRemote.GameService.roomState[params.roomId]){
				//console.log("params.roomId : "+params.roomId)
				//console.log("type : "+typeof(params.roomId))
                //console.log(GameRemote.GameService.roomList[roomId])
                cb(false,{"code" : tips.NO_ROOM})
                return
			}
			var roomId = params.roomId
			//不能进入锁定的房间
			if(GameRemote.GameService.roomLock[roomId] == false){
				cb(false,{"code" : tips.LOCK_ROOM})
				return
			}
			async.waterfall([
				function(next) {
					//获取玩家钻石，判断是否满足准入数额
					self.app.rpc.db.remote.getValue(null,uid,"diamond",function(data){
						next(null,data)
					})
				},
				function(data,next) {
					var diamond = data
					var needMond = 0
					switch(GameRemote.GameService.roomList[roomId].consumeMode){
						case conf.MODE_DIAMOND_HOST : 
							needMond = 0
						break;
						case conf.MODE_DIAMOND_EVERY :
							needMond = GameRemote.GameService.roomList[roomId].needDiamond
						break;
						case conf.MODE_DIAMOND_WIN : 
							needMond = GameRemote.GameService.roomList[roomId].needDiamond * 3;
						break;
					} 
					if(diamond >= needMond){
						next()
					}else{
						cb(false,{"code" :tips.NO_DIAMOND})
						return
					}
				},
				function(next) {
					//获取玩家信息
					self.app.rpc.db.remote.getPlayerInfoByUid(null,uid,function(data) {
						next(null,data)
					})
				},
				function(playerInfo) {
					delete playerInfo["history"]
					//加入房间
					var roomId = params.roomId
					var ip = params.ip;
					GameRemote.GameService.roomList[roomId].handle.join(uid,sid,{ip : ip,playerInfo : playerInfo},function (flag,code) {
						if(flag === true){
							GameRemote.GameService.userMap[uid] = roomId;
						}
						cb(flag,{"code" : code})
					})
				}
			],function(err,result) {
				//console.log(err)
				//console.log(result)
				cb(false)
				return
			})
		}else{
			var roomId = GameRemote.GameService.userMap[uid]
			GameRemote.GameService.roomList[roomId].reconnection(uid,sid,null,function(flag) {
				cb(flag)
			})
			return
		}		
	}else if(code == "newRoom"){
		//无效数据判断
		if(!params.gameNumber || typeof(params.gameNumber) !== "number" || (params.gameNumber != 10 && params.gameNumber != 20)){
	      //console.log("agency error   param.gameNumber : "+params.gameNumber)
	      cb(false)
	      return
	    }  
	  async.waterfall([
			function(next) {
				//获取玩家钻石
				self.app.rpc.db.remote.getValue(null,uid,"diamond",function(data){
					next(null,data)
				})
			}, 
			function(data,next) {
				//console.log("a111111 : "+GameRemote.GameService.userMap[uid])
				//判断是否满足准入数额
				var diamond = data
				var needMond = Math.ceil(params.gameNumber / 10)
				switch(params.consumeMode){
					case conf.MODE_DIAMOND_HOST : 
						needMond = needMond * 3
					break;
					case conf.MODE_DIAMOND_EVERY :
						needMond = needMond
					break;
					case conf.MODE_DIAMOND_WIN : 
						needMond = needMond * 3
					break;
				}
				if(diamond >= needMond && GameRemote.GameService.userMap[uid] === undefined){
					next(null)
				}else{
					cb(false,{"code" :tips.NO_DIAMOND})
				}
				return
			},
			function(next) {
				//console.log("a222222")
				//获取玩家信息
				//console.log(GameRemote.dbService)
				self.app.rpc.db.remote.getPlayerInfoByUid(null,uid,function(data) {
					next(null,data)
				})
			},
			function(playerInfo) {
				//console.log("a3333")
				//找到空闲房间ID
				delete playerInfo["history"]
				params.playerInfo = playerInfo
				var roomId = GameRemote.GameService.getUnusedRoom(params.gameType)
				if(roomId !== false){		
					GameRemote.GameService.roomList[roomId].handle.newRoom(uid,sid,params,function (flag) {
						if(flag === true){
							GameRemote.GameService.userMap[uid] = roomId;
							GameRemote.GameService.roomState[roomId] = false;
							var info = "   newRoom   roomId  : "+ roomId + "    uid : "+uid+ "   gameType : "+params.gameType + "   gameNumber : "+params.gameNumber
							openRoomLogger.info(info)
							//做个保护  创建房间后把定时器取消
							clearTimeout(GameRemote.GameService.lockTimer[roomId])
							delete GameRemote.GameService.lockTimer[roomId]
						}
						cb(flag)
					})
				}else{
					cb(false,{"code" :tips.FULL_ROOM})
				}
			}
	  	], function (err, result) {
			console.log(err)
			console.log(result)
			cb(false)
			return
	  });
	}else if(code == "agency"){
		//代开房
		//TODO  无效数据判断
	    if(!params.gameType || !conf.GAME_TYPE[params.gameType]){
	    	cb(false)
	    	return
	    }
		if(!params.gameNumber || typeof(params.gameNumber) !== "number" || (params.gameNumber != 10 && params.gameNumber != 20)){
	      console.log("agency error   param.gameNumber : "+params.gameNumber)
	      cb(false)
	      return
	    }   
	    var roomId = 0
	    var needMond = 0
	    async.waterfall([
	    	function(next) {
	    		//检查有没有空闲房间
	    		roomId = GameRemote.GameService.getUnusedRoom(params.gameType)
	    		if(roomId !== false){
	    			next()
	    		}else{
	    			cb(false,{"code" : tips.FULL_ROOM})
	    		}
	    	},
	    	function(next) {
				//获取玩家钻石
				self.app.rpc.db.remote.getValue(null,uid,"diamond",function(data){
					next(null,data)
				})	    		
	    	},
	    	function(data,next) {
	    		//检查钻石是否足够
				var diamond = data
				needMond = Math.ceil(params.gameNumber / 10) * 3
				if(diamond < needMond){
					cb(false,{"code" : tips.NO_DIAMOND})
					return
				} 
				next()
				return
	    	},
	    	function(next) {
	    		//代开房
				GameRemote.GameService.roomList[roomId].handle.agency(uid,sid,params,function (flag) {
					if(flag === true){
						GameRemote.GameService.roomState[roomId] = false;
						next(null,roomId)
						//保存代开房记录   state : 0 未开始   1 正在游戏中 2 已结束   3 已失效 
						var agencyRoomInfo = {
							"roomId" : roomId,
							"state" : 0,
							"gameType" : params.gameType,
							"gameNumber" : params.gameNumber,
							"gameMode" : params.gameMode,
							"cardMode" : params.cardMode,
							"basic" : params.basic
						}
						// self.app.rpc.db.remote.setAgencyRoom(null,uid,agencyRoomInfo,function() {})
						GameRemote.GameService.setAgencyRoom(uid,agencyRoomInfo)
						var info = "   agency   roomId  : "+ roomId + "    uid : "+uid+ "   gameType : "+params.gameType + "gameNumber : "+params.gameNumber
						openRoomLogger.info(info)
					}else{
						//删除房间
						GameRemote.GameService.roomState[roomId] = true
						GameRemote.GameService.roomList[roomId] = false
						cb(false)
					}
				})	    		
	    	},function(roomId) {
				//扣除钻石
				GameRemote.app.rpc.db.remote.setValue(null,uid,"diamond",-(needMond),function(flag) {
					if(!flag){
						//删除房间
						GameRemote.GameService.roomState[roomId] = true
						GameRemote.GameService.roomList[roomId] = false
						cb(false)
						return
					}
					cb(true,{"roomId" : roomId})
				})	    		
	    	}	    		    	
	    	], function (err, result) {
			console.log(err)
			console.log(result)
			cb(false)
			return
	  })		
	}else{
		//用户存在房间内时才执行
		//console.log("room id : " + GameRemote.GameService.userMap[uid])
		if(GameRemote.GameService.userMap[uid] !== undefined){
			var roomId = GameRemote.GameService.userMap[uid];
			if(roomId != undefined && GameRemote.GameService.roomList[roomId].handle[code] != undefined){
			    GameRemote.GameService.roomList[roomId].handle[code](uid,sid,params,cb)
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
	if(GameRemote.GameService.userMap[uid] != undefined){
		var roomId = GameRemote.GameService.userMap[uid]
		GameRemote.GameService.roomList[roomId].leave(uid)
	}
	if(cb){
		cb()
	}
};

//检测是否需要重连
GameRemote.prototype.reconnection = function(uid, sid,cb) {
	if(GameRemote.GameService.userMap[uid] !== undefined){
		var roomId = GameRemote.GameService.userMap[uid]
		GameRemote.GameService.roomList[roomId]["reconnection"](uid,sid,null,cb)
	}else{
		cb()
	}
}


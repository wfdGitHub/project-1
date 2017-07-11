//var gameHandle = require('../handler/handle');
var conf = require("../../../conf/niuniuConf.js").niuConf
var tips = require("../../../conf/tips.js").tipsConf
var async = require("async")
var openRoomLogger = require("pomelo-logger").getLogger("openRoom-log");
//console.log(conf)
module.exports = function(app) {
	return new GameRemote(app);
};
var local = {}
var GameRemote = function(app) {
	this.app = app
	GameRemote.app = app
	GameRemote.GameService = this.app.get("GameService")
};


//获取代开房数据
GameRemote.prototype.getAgencyRoom = function(uid,cb) {
	var data = GameRemote.GameService.getAgencyRoom(uid)
	if(cb){
		cb(data)
	}
}

GameRemote.prototype.onFrame = function(uid, sid,code,params,cb) {
	switch(code){
		case "finish" : 
		case "userQuit" :
			if(!GameRemote.GameService.userMap[uid]){
				cb(false)
				return
			}	
			var roomId = GameRemote.GameService.userMap[uid]
			//不能重复发送
			if(GameRemote.GameService.roomLock[roomId] == false){
				cb(false)
				return
			}
			if(GameRemote.GameService.roomList[roomId].isBegin()){
				//游戏已开始为解散
				//只有空闲时间能解散
				if(!GameRemote.GameService.roomList[roomId].isFree()){
					cb(false)
					return
				}
				//锁定房间
				GameRemote.GameService.roomLock[roomId] = false
				//通知其他玩家
				var chair = GameRemote.GameService.roomList[roomId].chairMap[uid]
				var notify = {
					"cmd" : "finishGame",
					"chair" : chair
				}
				GameRemote.GameService.roomList[roomId].channel.pushMessage('onMessage',notify)
				//发起解散的玩家默认同意
				local.responseFinish(roomId,chair,true)
				//三分钟后默认同意
				var timerCb = function(roomId) {
					return function() {
						var gamePlayer = GameRemote.GameService.roomList[roomId].GAME_PLAYER
						for(var i = 0;i < gamePlayer;i++){
							if(GameRemote.GameService.lockState[roomId][i] != false){
								GameRemote.GameService.lockState[roomId][i] = true
							}
						}					
						local.endFinish(roomId)
					}
				}(roomId)
				GameRemote.GameService.lockTimer[roomId] = setTimeout(timerCb,180 * 1000)
				cb(true)
			}else{
				//游戏未开始则为退出
				if(GameRemote.GameService.roomList[roomId].userQuit){
					GameRemote.GameService.roomList[roomId].userQuit(uid,function() {
						delete GameRemote.GameService.userMap[uid]
					})
				}			
				cb(true)				
			}
			break
		case "agreeFinish" :
			if(!GameRemote.GameService.userMap[uid]){
				cb(false)
				return
			}
			var roomId = GameRemote.GameService.userMap[uid]	
			//房间必须已锁定		
			if(GameRemote.GameService.roomLock[roomId] == true){
				cb(false)
				return
			}
			var chair = GameRemote.GameService.roomList[roomId].chairMap[uid]
			//已发送不能再次发送
			if(GameRemote.GameService.lockState[roomId][chair] !== undefined){
				cb(false)
				return
			}
			local.responseFinish(roomId,chair,true)
			cb(true)
			break
		case "refuseFinish" :
			if(!GameRemote.GameService.userMap[uid]){
				cb(false)
				return
			}
			var roomId = GameRemote.GameService.userMap[uid]	
			//房间必须已锁定		
			if(GameRemote.GameService.roomLock[roomId] == true){
				cb(false)
				return
			}
			var chair = GameRemote.GameService.roomList[roomId].chairMap[uid]
			//已发送不能再次发送
			if(GameRemote.GameService.lockState[roomId][chair] !== undefined){
				cb(false)
				return
			}
			local.responseFinish(roomId,chair,false)
			cb(true)
			break
	}
}

local.responseFinish = function(roomId,chair,flag) {
	//记录响应状态
	GameRemote.GameService.lockState[roomId][chair] = flag
	//console.log(GameRemote.GameService.lockState[roomId])
	var notify = {
		"cmd" : "responseFinish",
		"chair" : chair,
		"result" : flag
	}
	GameRemote.GameService.roomList[roomId].channel.pushMessage('onMessage',notify)
	//同意人数大于等于一半   或者拒绝人数大于一半结束请求
	var roomPlayer = GameRemote.GameService.roomList[roomId].getPlayerCount()
	var agreeCount = 0
	var refuseCount = 0
	for(var index in GameRemote.GameService.lockState[roomId]){
		if(GameRemote.GameService.lockState[roomId].hasOwnProperty(index)){
			//console.log("chair : "+chair +"    "+GameRemote.GameService.lockState[roomId][chair])
			if(GameRemote.GameService.lockState[roomId][index] == true){
				agreeCount++
			}else{
				refuseCount++
			}
		}
	}
	// console.log("roomPlayer : "+roomPlayer)
	// console.log("agreeCount : "+agreeCount)
	// console.log("refuseCount : "+refuseCount)
	if(agreeCount > roomPlayer/2){
		//console.log("enfFinish true")
		local.endFinish(roomId)
	}else if(refuseCount >= roomPlayer/2){
		//console.log("enfFinish flase")
		local.endFinish(roomId)
	}
}
local.endFinish = function(roomId) {
	//清除定时器
	clearTimeout(GameRemote.GameService.lockTimer[roomId])
	delete GameRemote.GameService.lockTimer[roomId]
	//结束响应请求
	var roomPlayer = GameRemote.GameService.roomList[roomId].getPlayerCount()
	var agreeCount = 0
	var refuseCount = 0
	for(var index in GameRemote.GameService.lockState[roomId]){
		if(GameRemote.GameService.lockState[roomId].hasOwnProperty(index)){
			if(GameRemote.GameService.lockState[roomId][index] == true){
				agreeCount++
			}else{
				refuseCount++
			}
		}
	}
	if(agreeCount > roomPlayer/2){
		var notify = {
			"cmd" : "endFinish",
			"result" : true
		}
		GameRemote.GameService.roomList[roomId].channel.pushMessage('onMessage',notify)
		//解散房间
		if(GameRemote.GameService.roomList[roomId].finishGame){
			GameRemote.GameService.roomList[roomId].finishGame()
		}
	}else if(refuseCount >= roomPlayer/2){
		//不解散房间
		var notify = {
			"cmd" : "endFinish",
			"result" : false
		}
		GameRemote.GameService.roomList[roomId].channel.pushMessage('onMessage',notify)
	}
	GameRemote.GameService.roomLock[roomId] = true
	GameRemote.GameService.lockState[roomId] = {}
}
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


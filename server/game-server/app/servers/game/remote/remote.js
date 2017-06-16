//var gameHandle = require('../handler/handle');
var conf = require("../../../conf/niuniuConf.js").niuConf
var tips = require("../../../conf/tips.js").tipsConf
var async = require("async")
//console.log(conf)
module.exports = function(app) {
	return new GameRemote(app);
};
var local = {}
var GameRemote = function(app) {
	this.app = app
	GameRemote.app = app
	GameRemote.niuniuService = this.app.get("NiuNiuService")
};
GameRemote.prototype.onFrame = function(uid, sid,code,params,cb) {
	switch(code){
		case "finish" : 
			if(!GameRemote.niuniuService.userMap[uid]){
				cb(false)
				return
			}
			//房间未开始不能发起解散
			if(!room.isBegin()){
				cb(false)
				return
			}
			var roomId = GameRemote.niuniuService.userMap[uid]
			//不能重复发送
			if(GameRemote.niuniuService.roomLock[roomId] == false){
				cb(false)
				return
			}
			//只有空闲时间能解散
			if(!GameRemote.niuniuService.roomList[roomId].isFree()){
				cb(false)
				return
			}
			//锁定房间
			GameRemote.niuniuService.roomLock[roomId] = false
			//通知其他玩家
			var chair = GameRemote.niuniuService.roomList[roomId].chairMap[uid]
			var notify = {
				"cmd" : "finishGame",
				"chair" : chair
			}
			GameRemote.niuniuService.roomList[roomId].channel.pushMessage('onMessage',notify)
			//发起解散的玩家默认同意
			local.responseFinish(roomId,chair,true)
			//三分钟后默认同意
			var timerCb = function(roomId) {
				return function() {
					var gamePlayer = GameRemote.niuniuService.roomList[roomId].GAME_PLAYER
					for(var i = 0;i < gamePlayer;i++){
						if(GameRemote.niuniuService.lockState[roomId][i] != false){
							GameRemote.niuniuService.lockState[roomId][i] = true
						}
					}					
					local.endFinish(roomId)
				}
			}(roomId)
			GameRemote.niuniuService.lockTimer[roomId] = setTimeout(timerCb,180 * 1000)
			cb(true)
			break
		case "agreeFinish" :
			if(!GameRemote.niuniuService.userMap[uid]){
				cb(false)
				return
			}
			var roomId = GameRemote.niuniuService.userMap[uid]	
			//房间必须已锁定		
			if(GameRemote.niuniuService.roomLock[roomId] == true){
				cb(false)
				return
			}
			var chair = GameRemote.niuniuService.roomList[roomId].chairMap[uid]
			//已发送不能再次发送
			if(GameRemote.niuniuService.lockState[roomId][chair] !== undefined){
				cb(false)
				return
			}
			local.responseFinish(roomId,chair,true)
			cb(true)
			break
		case "refuseFinish" :
			if(!GameRemote.niuniuService.userMap[uid]){
				cb(false)
				return
			}
			var roomId = GameRemote.niuniuService.userMap[uid]	
			//房间必须已锁定		
			if(GameRemote.niuniuService.roomLock[roomId] == true){
				cb(false)
				return
			}
			var chair = GameRemote.niuniuService.roomList[roomId].chairMap[uid]
			//已发送不能再次发送
			if(GameRemote.niuniuService.lockState[roomId][chair] !== undefined){
				cb(false)
				return
			}
			local.responseFinish(roomId,chair,false)
			cb(true)
			break
		case "userQuit" :
			if(!GameRemote.niuniuService.userMap[uid]){
				cb(false)
				return
			}		
			var roomId = GameRemote.niuniuService.userMap[uid]
			if(GameRemote.niuniuService.roomList[roomId].isBegin() == true){
				cb(false)
				return
			}
			if(GameRemote.niuniuService.roomList[roomId].userQuit){
				GameRemote.niuniuService.roomList[roomId].userQuit(uid,function() {
					delete GameRemote.niuniuService.userMap[uid]
				})
			}			
			cb(true)
			break
	}
}

local.responseFinish = function(roomId,chair,flag) {
	//记录响应状态
	GameRemote.niuniuService.lockState[roomId][chair] = flag
	//console.log(GameRemote.niuniuService.lockState[roomId])
	var notify = {
		"cmd" : "responseFinish",
		"chair" : chair,
		"result" : flag
	}
	GameRemote.niuniuService.roomList[roomId].channel.pushMessage('onMessage',notify)
	//同意人数大于等于一半   或者拒绝人数大于一半结束请求
	var roomPlayer = GameRemote.niuniuService.roomList[roomId].getPlayerCount()
	var agreeCount = 0
	var refuseCount = 0
	for(var index in GameRemote.niuniuService.lockState[roomId]){
		if(GameRemote.niuniuService.lockState[roomId].hasOwnProperty(index)){
			//console.log("chair : "+chair +"    "+GameRemote.niuniuService.lockState[roomId][chair])
			if(GameRemote.niuniuService.lockState[roomId][index] == true){
				agreeCount++
			}else{
				refuseCount++
			}
		}
	}
	// console.log("roomPlayer : "+roomPlayer)
	// console.log("agreeCount : "+agreeCount)
	// console.log("refuseCount : "+refuseCount)
	if(agreeCount >= roomPlayer/2){
		//console.log("enfFinish true")
		local.endFinish(roomId)
	}else if(refuseCount > roomPlayer/2){
		//console.log("enfFinish flase")
		local.endFinish(roomId)
	}
}
local.endFinish = function(roomId) {
	//清除定时器
	clearTimeout(GameRemote.niuniuService.lockTimer[roomId])
	delete GameRemote.niuniuService.lockTimer[roomId]
	//结束响应请求
	var roomPlayer = GameRemote.niuniuService.roomList[roomId].getPlayerCount()
	var agreeCount = 0
	var refuseCount = 0
	for(var index in GameRemote.niuniuService.lockState[roomId]){
		if(GameRemote.niuniuService.lockState[roomId].hasOwnProperty(index)){
			if(GameRemote.niuniuService.lockState[roomId][index] == true){
				agreeCount++
			}else{
				refuseCount++
			}
		}
	}
	if(agreeCount >= roomPlayer/2 || flag){
		var notify = {
			"cmd" : "endFinish",
			"result" : true
		}
		GameRemote.niuniuService.roomList[roomId].channel.pushMessage('onMessage',notify)
		//解散房间
		if(GameRemote.niuniuService.roomList[roomId].finishGame){
			GameRemote.niuniuService.roomList[roomId].finishGame()
		}
	}else if(refuseCount > roomPlayer/2){
		//不解散房间
		var notify = {
			"cmd" : "endFinish",
			"result" : false
		}
		GameRemote.niuniuService.roomList[roomId].channel.pushMessage('onMessage',notify)
	}
	GameRemote.niuniuService.roomLock[roomId] = true
	GameRemote.niuniuService.lockState[roomId] = {}
}
GameRemote.prototype.receive = function(uid, sid,code,params,cb) {
	console.log("uid : "+uid+"code : "+code)
	//房间已锁定则拒绝操作
	if(GameRemote.niuniuService.userMap[uid]){
		var roomId = GameRemote.niuniuService.userMap[uid]
		if(GameRemote.niuniuService.roomLock[roomId] == false){
			cb(false)
			return
		}
	}

	var self = this
	//加入房间需要用户不在房间内
	if(code == "join"){
		if(!GameRemote.niuniuService.userMap[uid]){
			//无效条件判断
			if(typeof(params.roomId) != "number" || params.roomId < 0 || !GameRemote.niuniuService.roomList[params.roomId]){
				console.log("params.roomId : "+params.roomId)
				console.log("type : "+typeof(params.roomId))
                console.log(GameRemote.niuniuService.roomList[roomId])
                cb(false,{"code" : tips.NO_ROOM})
                return
			}
			var roomId = params.roomId
			//不能进入锁定的房间
			if(GameRemote.niuniuService.roomLock[roomId] == false){
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
					switch(GameRemote.niuniuService.roomList[roomId].consumeMode){
						case conf.MODE_DIAMOND_HOST : 
							needMond = 0
						break;
						case conf.MODE_DIAMOND_EVERY :
							needMond = GameRemote.niuniuService.roomList[roomId].needDiamond
						break;
						case conf.MODE_DIAMOND_WIN : 
							needMond = GameRemote.niuniuService.roomList[roomId].needDiamond * 6;
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
					//加入房间
					var roomId = params.roomId
					var ip = params.ip;
					GameRemote.niuniuService.roomList[roomId].handle.join(uid,sid,{ip : ip,playerInfo : playerInfo},function (flag) {
						if(flag === true){
							GameRemote.niuniuService.userMap[uid] = roomId;
						}
						cb(flag)
					})
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
		//无效数据判断
		if(!params.gameNumber || typeof(params.gameNumber) !== "number" || (params.gameNumber != 10 && params.gameNumber != 20)){
	      console.log("agency error   param.gameNumber : "+params.gameNumber)
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
				//console.log("a111111 : "+GameRemote.niuniuService.userMap[uid])
				//判断是否满足准入数额
				var diamond = data
				var needMond = Math.ceil(params.gameNumber / 10)
				switch(params.consumeMode){
					case conf.MODE_DIAMOND_HOST : 
						needMond = needMond * 6
					break;
					case conf.MODE_DIAMOND_EVERY :
						needMond = needMond
					break;
					case conf.MODE_DIAMOND_WIN : 
						needMond = needMond * 6
					break;
				}
				if(diamond >= needMond && GameRemote.niuniuService.userMap[uid] === undefined){
					next(null)
				}else{
					cb(false,{"code" :tips.NO_DIAMOND})
				}
				return
			},
			function(next) {
				//console.log("a222222")
				//获取玩家信息
				console.log(GameRemote.dbService)
				self.app.rpc.db.remote.getPlayerInfoByUid(null,uid,function(data) {
					next(null,data)
				})
			},
			function(playerInfo) {
				//console.log("a3333")
				//找到空闲房间ID
				params.playerInfo = playerInfo
				var roomId = GameRemote.niuniuService.getUnusedRoom(params.gameType)
				if(roomId !== false){		
					GameRemote.niuniuService.roomList[roomId].handle.newRoom(uid,sid,params,function (flag) {
						if(flag === true){
							GameRemote.niuniuService.userMap[uid] = roomId;
							GameRemote.niuniuService.roomState[roomId] = false;
							//做个保护  创建房间后把
							clearTimeout(GameRemote.niuniuService.lockTimer[roomId])
							delete GameRemote.niuniuService.lockTimer[roomId]
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
	    		roomId = GameRemote.niuniuService.getUnusedRoom(params.gameType)
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
				needMond = Math.ceil(params.gameNumber / 10) * 6
				if(diamond < needMond){
					cb(false,{"code" : tips.NO_DIAMOND})
					return
				} 
				next()
				return
	    	},
	    	function(next) {
	    		//代开房
				GameRemote.niuniuService.roomList[roomId].handle.agency(uid,sid,params,function (flag) {
					if(flag === true){
						GameRemote.niuniuService.roomState[roomId] = false;
						next(null,roomId)
					}else{
						//删除房间
						NiuNiuService.roomState[roomId] = true
						NiuNiuService.roomList[roomId] = false
						cb(false)
					}
				})	    		
	    	},function(roomId) {
				//扣除钻石
				GameRemote.app.rpc.db.remote.setValue(null,uid,"diamond",-(needMond),function(flag) {
					if(!flag){
						//删除房间
						NiuNiuService.roomState[roomId] = true
						NiuNiuService.roomList[roomId] = false
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
		console.log("room id : " + GameRemote.niuniuService.userMap[uid])
		if(GameRemote.niuniuService.userMap[uid] !== undefined){
			var roomId = GameRemote.niuniuService.userMap[uid];
			if(roomId != undefined && GameRemote.niuniuService.roomList[roomId].handle[code] != undefined){
			    GameRemote.niuniuService.roomList[roomId].handle[code](uid,sid,params,cb)
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
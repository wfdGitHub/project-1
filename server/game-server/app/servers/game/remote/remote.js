//var gameHandle = require('../handler/handle');
var conf = require("../../../conf/niuniuConf.js").niuConf
var tips = require("../../../conf/tips.js").tipsConf
var async = require("async")
var openRoomLogger = require("pomelo-logger").getLogger("openRoom-log");
var httpConf = require("../../../conf/httpModule.js")

//console.log(conf)
module.exports = function(app) {
	return new GameRemote(app);
};
var local = {}
var GameRemote = function(app) {
	this.app = app
	GameRemote.app = app
	GameRemote.GameService = this.app.get("GameService")
	GameRemote.backendSessionService = this.app.get('backendSessionService');
	GameRemote.NodeNumber = 0
};


//获取代开房数据
GameRemote.prototype.getAgencyRoom = function(uid,cb) {
	var data = GameRemote.GameService.getAgencyRoom(uid)
	//当前玩家数据
	if(data){
		for(var index in data.List){
			if(data.List.hasOwnProperty(index)){
				//未开始或正在游戏中
				if(data.List[index].state == 0 || data.List[index].state == 1){
					data.List[index].players = GameRemote.GameService.RoomMap[data.List[index].roomId]
				}
			}
		}		
	}
	if(cb){
		cb(data)
	}
}

GameRemote.prototype.onFrame = function(uid, sid,code,params,cb) {
	if(GameRemote.GameService.userMap[uid] !== undefined){
		var roomId = GameRemote.GameService.userMap[uid]
		params = {}
		params.gid = GameRemote.GameService.roomList[roomId]
		this.app.rpc.gameNode.remote.onFrame(null,params,uid,code,function (flag){
			cb(flag)
		})
	}else if(code == "agencyFinish"){
		var roomId = params.roomId
		params.gid = GameRemote.GameService.roomList[roomId]
		if(params.gid !== undefined){
			this.app.rpc.gameNode.remote.onFrame(null,params,uid,code,function (flag){
				cb(flag)
			})			
		}else{
			cb(false)
		}
	}else{
		cb(false)
	}
}

GameRemote.userConnectorMap = {}


//用户连接
GameRemote.prototype.userConnect = function(uid,sid,cb) {
	GameRemote.userConnectorMap[uid] = sid
	if(cb){
		cb()
	}
}

GameRemote.prototype.receive = function(uid, sid,code,params,cb) {
	// //console.log("uid : "+uid+"code : "+code)
	// //房间已锁定则拒绝操作
	// if(GameRemote.GameService.userMap[uid]){
	// 	var roomId = GameRemote.GameService.userMap[uid]
	// 	if(GameRemote.GameService.roomLock[roomId] == false){
	// 		cb(false)
	// 		return
	// 	}
	// }
	var self = this
	//加入房间需要用户不在房间内
	if(code == "join"){
		if(!GameRemote.GameService.userMap[uid]){
			//无效条件判断
			if(typeof(params.roomId) != "number" || params.roomId < 0 
				|| GameRemote.GameService.roomList[params.roomId] === undefined || GameRemote.GameService.roomState[params.roomId]){
				//console.log("params.roomId : "+params.roomId)
				//console.log("type : "+typeof(params.roomId))
                //console.log(GameRemote.GameService.roomList[roomId])
                cb(false,{"code" : tips.NO_ROOM})
                return
			}
			var roomId = params.roomId
			params.gid = GameRemote.GameService.roomList[roomId]
			self.app.rpc.gameNode.remote.join(null,params,uid,sid,roomId,function(flag,msg,playerInfo){
				if(flag === true){
					GameRemote.GameService.userMap[uid] = roomId;
					if(GameRemote.GameService.RoomMap[roomId]){
						var info = {
							"uid" : playerInfo.uid,
							"nickname" : playerInfo.nickname,
							"head" : playerInfo.head
						}
						GameRemote.GameService.RoomMap[roomId].push(info)
					}
				}
				cb(flag,msg)
			})
		}else{
			cb(false)
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
					//分配游戏服务器
					GameRemote.NodeNumber++
					var nodeLength = GameRemote.app.getServersByType('gameNode').length
					if(GameRemote.NodeNumber >= nodeLength){
						GameRemote.NodeNumber = 0
					}
					//记录房间对应游戏服务器
					GameRemote.GameService.roomList[roomId] = GameRemote.NodeNumber
					params.gid = GameRemote.GameService.roomList[roomId]
					//与游戏服务器连接
					self.app.rpc.gameNode.remote.newRoom(null,params,uid,sid,roomId,function (flag) {
						console.log("======== : "+flag)
						if(flag === true){
							GameRemote.GameService.userMap[uid] = roomId;
							GameRemote.GameService.roomState[roomId] = false;
							GameRemote.GameService.RoomMap[roomId] = []
							var info = {
								"uid" : playerInfo.uid,
								"nickname" : playerInfo.playerInfo,
								"head" : playerInfo.head
							}
							GameRemote.GameService.RoomMap[roomId].push(info)
						}else{
							GameRemote.GameService.roomState[roomId] = true
							GameRemote.GameService.roomList[roomId] = false
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
				if(params.gameType == "sanKung"){
					needMond = Math.ceil(params.gameNumber / 10) * 5
				}
				if(diamond < needMond){
					cb(false,{"code" : tips.NO_DIAMOND})
					return
				} 
				next()
				return
	    	},
	    	function(next) {
	    		//代开房
	    		//分配游戏服务器
				GameRemote.NodeNumber++
				var nodeLength = GameRemote.app.getServersByType('gameNode').length
				if(GameRemote.NodeNumber >= nodeLength){
					GameRemote.NodeNumber = 0
				}
				//记录房间对应游戏服务器
				GameRemote.GameService.roomList[roomId] = GameRemote.NodeNumber
				params.gid = GameRemote.GameService.roomList[roomId]
				//与游戏服务器连接
				self.app.rpc.gameNode.remote.agencyRoom(null,params,uid,sid,roomId,function (flag) {
					console.log("======== : "+flag)
					if(flag === true){
						GameRemote.GameService.roomState[roomId] = false;
                        //保存代开房记录   state : 0 未开始   1 正在游戏中 2 已结束   3 已失效 
                        var agencyRoomInfo = {
                            "roomId" : roomId,
                            "state" : 0,
                            "gameType" : params.gameType,
                            "gameNumber" : params.gameNumber,
                            "gameMode" : params.gameMode,
                            "cardMode" : params.cardMode,
                            "basic" : params.basic || params.basicType,
                            "beginTime" : (new Date()).valueOf()
                        }
                        GameRemote.GameService.setAgencyRoom(uid,agencyRoomInfo)
                        GameRemote.GameService.RoomMap[roomId] = []
						next(null,roomId)
					}else{
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
					//钻石消耗记录
					GameRemote.app.rpc.db.remote.setValue(null,uid,"useDiamond",needMond,function() {})
					httpConf.coinChangeRecord(uid,7,-needMond)
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
			if(roomId != undefined){
				if(!params){
					params = {}
				}
				params.gid = GameRemote.GameService.roomList[roomId]
				self.app.rpc.gameNode.remote.receive(null,params,uid,sid,roomId,code,function (flag){
					cb(flag)
				})
			}else{
			    cb(false)
			}
		}
		else{
			cb(false)
		}
	}
};

//游戏结束回调
GameRemote.prototype.gameOver = function(roomId,players,flag,agencyId,maxGameNumber,cb) {
	//解锁房间内玩家   清理房间  更新代开房记录
	var roomPlayerCount = 0
	for(var index in players){
		if(players.hasOwnProperty(index)){
			if(players[index].isActive){		
                roomPlayerCount++
                delete GameRemote.GameService.userMap[players[index].uid]
			}
		}
	}
	//更新代开房记录   state : 0 未结束   1 正在游戏中 2 已结束   3 已失效 
	if(agencyId){
		var agencyRoomInfo = GameRemote.GameService.getAgencyRoomByID(agencyId,roomId)
		agencyRoomInfo.endTime = (new Date()).valueOf()
		agencyRoomInfo.state = 2
		if(flag == true){
			agencyRoomInfo.state = 3
		}else{
			var agencyPlayer = {}
			var nowIndex = 0
			for(var index in players){
				if(players.hasOwnProperty(index)){
					if(players[index].isActive){
						agencyPlayer[nowIndex++] = {
							"name" : players[index].playerInfo.nickname,
							"score" : players[index].score
						}
					}
				}	
			}
			agencyRoomInfo.player = agencyPlayer
		}
		GameRemote.GameService.setAgencyRoomByID(agencyId,roomId,agencyRoomInfo)
	}

	GameRemote.GameService.roomState[roomId] = true
	GameRemote.GameService.roomList[roomId] = false
	delete GameRemote.GameService.RoomMap[roomId]
	if(cb){
		cb()
	}
}

//游戏开始回调
GameRemote.prototype.gameBeginCB = function(roomId,agencyId,cb) {
	console.log("gameBeginCB========== agencyId : "+agencyId)
	//更新代开房数据
	if(agencyId){
		var agencyRoom = GameRemote.GameService.getAgencyRoomByID(agencyId,roomId)
		agencyRoom.state = 1
		GameRemote.GameService.setAgencyRoomByID(agencyId,roomId,agencyRoom)
	}
	if(cb){
		cb()
	}
}

GameRemote.prototype.kick = function(uid,cb) {
	console.log("user leave : "+uid)
	if(GameRemote.GameService.userMap[uid] != undefined){
		var roomId = GameRemote.GameService.userMap[uid]
		var params = {}
		params.gid = GameRemote.GameService.roomList[roomId]
		this.app.rpc.gameNode.remote.disconnect(null,params,uid,null,roomId,function (flag){
			cb(flag)
		})
	}
	if(cb){
		cb()
	}
};

//检测是否需要重连
GameRemote.prototype.reconnection = function(uid, sid,cb) {
	if(GameRemote.GameService.userMap[uid] !== undefined){
		var roomId = GameRemote.GameService.userMap[uid]
		var params = {}
		params.gid = GameRemote.GameService.roomList[roomId]
		this.app.rpc.gameNode.remote.reconnection(null,params,uid,sid,roomId,function (flag){
			cb(flag)
		})
	}else{
		cb()
	}
}

//用户退出房间
GameRemote.prototype.userQuit = function(uid,cb) {
	var roomId = GameRemote.GameService.userMap[uid]
	if(GameRemote.GameService.RoomMap[roomId]){
		for(var index in GameRemote.GameService.RoomMap[roomId]){
			if(GameRemote.GameService.RoomMap[roomId].hasOwnProperty(index)){
				if(GameRemote.GameService.RoomMap[roomId][index].uid == uid){
					GameRemote.GameService.RoomMap[roomId].splice(index,1)
					break;
				}
			}
		}
	}
	delete GameRemote.GameService.userMap[uid]
	cb(true)
}

//通知玩家
GameRemote.prototype.sendByUid = function(uid,notify,cb) {
	var params = {}
	params.cid = GameRemote.userConnectorMap[uid]
	if(params.cid){
		GameRemote.app.rpc.connector.remote.sendByUid(null,params,uid,notify,function(){})
	}
	cb()
}

var deepCopy = function(source) {
  var result={}
  for (var key in source) {
        result[key] = typeof source[key]==="object"? deepCopy(source[key]): source[key]
     } 
  return result;
}
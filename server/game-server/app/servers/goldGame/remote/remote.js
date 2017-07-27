//var gameHandle = require('../handler/handle');
var conf = require("../../../conf/niuniuConf.js").niuConf
var tips = require("../../../conf/tips.js").tipsConf
var async = require("async")
var openRoomLogger = require("pomelo-logger").getLogger("openRoom-log");
var MATCHTIME = 1500
var MAXMATCHTIMER = 6
var ROOMPLAYERNUM = 6
//console.log(conf)
module.exports = function(app) {
	return new GameRemote(app);
};
var local = {}
var gameType = {
	"niuniu" : true
}
var GameRemote = function(app) {
	this.app = app
	GameRemote.app = app
	GameRemote.NodeNumber = 0
	//房间列表
	GameRemote.roomList = {}
	//房间状态
	GameRemote.roomState = {}
	//用户房间映射表
	GameRemote.userMap = {}
	//房间与用户映射表
	GameRemote.RoomMap = {}
	//用户前端服务器ID
	GameRemote.userConnectorMap = {}
	//初始化匹配队列
	GameRemote.matchList = {}
	//匹配队列等待时间
	GameRemote.matchTimer = {}
	//房间类型与房间号映射表
	GameRemote.typeRoomMap = {}
	//房间号与房间类型映射表
	GameRemote.roomTypeMap = {}
	//玩家匹配队列映射表
	GameRemote.matchMap = {}
	for(var index in gameType){
		if(gameType.hasOwnProperty(index)){
			GameRemote.matchList[index] = []
			GameRemote.matchTimer[index] = 0
			GameRemote.typeRoomMap[index] = []
		}
	}
	//初始化房间
	for(var i = ROOM_BEGIN_INDEX;i < ROOM_ALL_AMOUNT + ROOM_BEGIN_INDEX;i++){
		GameRemote.roomState[i] = true
		GameRemote.roomList[i] = false
	}
	//开启定时匹配
	setInterval(local.matching,MATCHTIME)
};

//当房间人数发生变化时更新matchMap
local.updateMatchMap = function(){
	//TODO
}

//将队首玩家加入房间
local.joinRoom = function(type,roomId){
	console.log("joinRoom")
	console.log("type : "+type)
	console.log("roomId : "+roomId)
	//TODO    玩家加入房间
	if(GameRemote.RoomMap[roomId].length < ROOMPLAYERNUM){
		var uid = GameRemote.matchList[type][0]
		GameRemote.matchList[type].splice(0,1)
		GameRemote.RoomMap[roomId].push(uid)
		GameRemote.userMap[uid] = roomId
	}
}
//创建房间
local.createRoom = function(type) {
	var playerList = GameRemote.matchList[type]
	if(playerList.length >= ROOMPLAYERNUM){
		//凑整房间人数
		var roomCount = Math.floor(playerList.length / ROOMPLAYERNUM)
		for(var i = 0; i < roomCount; i++){
			var users = []
			for(var j = 0;j < ROOMPLAYERNUM;j++){
				users.push(GameRemote.matchList[type][0])
				GameRemote.matchList[type].splice(0,1)
				//TODO   创建房间   维护房间玩家映射表与玩家房间映射表
				var roomId = local.getUnusedRoom()
				
			}
		}
	}else{
		//人数不足一个房间补足机器人
		
	}
}


//定时匹配
local.matching = function(){
	for(var type in gameType){
		if(gameType.hasOwnProperty(type)){
			//匹配队列玩家列表
			var playerList = GameRemote.matchList[type]
			//已有房间列表
			var tmpRoomList = GameRemote.typeRoomMap[type]
			//从该类型的所有房间中找空闲房间
			for(var i = 0;i < tmpRoomList.length; i++){
				if(playerList.length <= 0){
					//等待队列空时结束本次匹配
					return
				}
				var roomId = tmpRoomList[i]
				var playerCount = GameRemote.RoomMap[roomId]
				if(playerCount < ROOMPLAYERNUM && playerList.length > 0){
					//当该房间人数未满则加入房间
					for(var j = playerCount; j < ROOMPLAYERNUM ; j++){
						if(playerList.length > 0){
							local.joinRoom(type,roomId)
							GameRemote.matchTimer[type] = 0
						}
					}
				}
			}
			if(playerList.length > 0){
				//已有房间已满   尝试创建新房间
				GameRemote.matchTimer[type]++
				//人数超过6人或匹配次数到达预计则开始游戏
				if(playerList.length >= ROOMPLAYERNUM || GameRemote.matchTimer[type] >= MAXMATCHTIMER){
					GameRemote.matchTimer[type] = 0
					//匹配成功的玩家开始匹配

				}
			}
		}
	}
}


//加入匹配队列
local.joinMatch = function(uid,sid,params,cb) {
	var gameType = params.gameType
	if(!params.gameType || typeof(gameType) !== "string" || !gameType[gameType]){
		console.log("params.gameType error : "+gameType)
		cb(false)
		return
	}
	if(GameRemote.matchMap[uid]){
		console.log("matching : "+uid)
		cb(false)
		return
	}
	GameRemote.matchList[gameType].push(uid)
	GameRemote.matchMap[uid] = gameType
}
//离开匹配队列
local.leaveMatch = function(uid,cb) {
	if(!GameRemote.matchMap[uid]){
		cb(false)
		return
	}
	//查找匹配位置
	var gameType = GameRemote.matchMap[uid]
	for(var i = 0; i < GameRemote.matchList[gameType].length; i++){
		if(GameRemote.matchList[gameType][i] == uid){
			//查找成功   从匹配队列删除
			GameRemote.matchList[gameType].splice(i,1)
			delete GameRemote.matchMap[uid]
			cb(true)
			return
		}
	}
	console.log("error leaveMatch can't find target !")
	cb(false)
}

local.join = function(uid,sid,params,self,cb) {
	//无效条件判断
	if(typeof(params.roomId) != "number" || params.roomId < 0 
		|| GameRemote.roomList[params.roomId] === undefined || GameRemote.roomState[params.roomId]){
        cb(false,{"code" : tips.NO_ROOM})
        return
	}
	var roomId = params.roomId
	params.gid = GameRemote.roomList[roomId]
	self.app.rpc.gameNode.remote.join(null,params,uid,sid,roomId,function(flag,msg,playerInfo){
		if(flag === true){
			GameRemote.userMap[uid] = roomId;
			if(GameRemote.RoomMap[roomId]){
				var info = {
					"uid" : playerInfo.uid,
					"nickname" : playerInfo.nickname,
					"head" : playerInfo.head
				}
				GameRemote.RoomMap[roomId].push(info)						
			}
		}
		cb(flag,msg)
	})
}


GameRemote.prototype.receive = function(uid, sid,code,params,cb) {
	GameRemote.userConnectorMap[uid] = sid
	var self = this
	//加入房间需要用户不在房间内
	if(code == "join"){
		if(!GameRemote.userMap[uid]){
				local.join(uid,sid,params,self,cb)
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
				if(diamond >= needMond && GameRemote.userMap[uid] === undefined){
					next(null)
				}else{
					cb(false,{"code" :tips.NO_DIAMOND})
				}
				return
			},
			function(next) {
				//获取玩家信息
				self.app.rpc.db.remote.getPlayerInfoByUid(null,uid,function(data) {
					next(null,data)
				})
			},
			function(playerInfo) {
				//找到空闲房间ID
				delete playerInfo["history"]
				params.playerInfo = playerInfo
				var roomId = local.getUnusedRoom(params.gameType)
				if(roomId !== false){		
					//分配游戏服务器
					GameRemote.NodeNumber++
					var nodeLength = GameRemote.app.getServersByType('gameNode').length
					if(GameRemote.NodeNumber >= nodeLength){
						GameRemote.NodeNumber = 0
					}
					//记录房间对应游戏服务器
					GameRemote.roomList[roomId] = GameRemote.NodeNumber
					params.gid = GameRemote.roomList[roomId]
					//与游戏服务器连接
					self.app.rpc.gameNode.remote.newRoom(null,params,uid,sid,roomId,function (flag) {
						console.log("======== : "+flag)
						if(flag === true){
							GameRemote.userMap[uid] = roomId;
							GameRemote.roomState[roomId] = false;
							GameRemote.RoomMap[roomId] = []
							var info = {
								"uid" : playerInfo.uid,
								"nickname" : playerInfo.playerInfo,
								"head" : playerInfo.head
							}
							GameRemote.RoomMap[roomId].push(info)
						}else{
							GameRemote.roomState[roomId] = true
							GameRemote.roomList[roomId] = false
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
	    		roomId = local.getUnusedRoom(params.gameType)
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
	    		//分配游戏服务器
				GameRemote.NodeNumber++
				var nodeLength = GameRemote.app.getServersByType('gameNode').length
				if(GameRemote.NodeNumber >= nodeLength){
					GameRemote.NodeNumber = 0
				}
				//记录房间对应游戏服务器
				GameRemote.roomList[roomId] = GameRemote.NodeNumber
				params.gid = GameRemote.roomList[roomId]
				//与游戏服务器连接
				self.app.rpc.gameNode.remote.agencyRoom(null,params,uid,sid,roomId,function (flag) {
					console.log("======== : "+flag)
					if(flag === true){
						GameRemote.roomState[roomId] = false;
                        //保存代开房记录   state : 0 未开始   1 正在游戏中 2 已结束   3 已失效 
                        var agencyRoomInfo = {
                            "roomId" : roomId,
                            "state" : 0,
                            "gameType" : params.gameType,
                            "gameNumber" : params.gameNumber,
                            "gameMode" : params.gameMode,
                            "cardMode" : params.cardMode,
                            "basic" : params.basic,
                            "beginTime" : (new Date()).valueOf()
                        }
                        GameRemote.GameRemote.setAgencyRoom(uid,agencyRoomInfo)
                        GameRemote.RoomMap[roomId] = []
						next(null,roomId)
					}else{
						GameRemote.roomState[roomId] = true
						GameRemote.roomList[roomId] = false
						cb(false)
					}
				})    		
	    	},function(roomId) {
				//扣除钻石
				GameRemote.app.rpc.db.remote.setValue(null,uid,"diamond",-(needMond),function(flag) {
					if(!flag){
						//删除房间
						GameRemote.roomState[roomId] = true
						GameRemote.roomList[roomId] = false
						cb(false)
						return
					}
					//钻石消耗记录
					GameRemote.app.rpc.db.remote.setValue(null,uid,"useDiamond",needMond,function() {})
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
		//console.log("room id : " + GameRemote.userMap[uid])
		if(GameRemote.userMap[uid] !== undefined){
			var roomId = GameRemote.userMap[uid];
			if(roomId != undefined){
				if(!params){
					params = {}
				}
				params.gid = GameRemote.roomList[roomId]
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
                delete GameRemote.userMap[players[index].uid]
			}
		}
	}
	//更新代开房记录   state : 0 未结束   1 正在游戏中 2 已结束   3 已失效 
	if(agencyId){
		var agencyRoomInfo = GameRemote.GameRemote.getAgencyRoomByID(agencyId,roomId)
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
		GameRemote.GameRemote.setAgencyRoomByID(agencyId,roomId,agencyRoomInfo)
	}

	GameRemote.roomState[roomId] = true
	GameRemote.roomList[roomId] = false
	delete GameRemote.RoomMap[roomId]
	if(cb){
		cb()
	}
}

//游戏开始回调
GameRemote.prototype.gameBeginCB = function(roomId,agencyId,cb) {
	console.log("gameBeginCB========== agencyId : "+agencyId)
	//更新代开房数据
	if(agencyId){
		var agencyRoom = GameRemote.GameRemote.getAgencyRoomByID(agencyId,roomId)
		agencyRoom.state = 1
		GameRemote.GameRemote.setAgencyRoomByID(agencyId,roomId,agencyRoom)
	}
	if(cb){
		cb()
	}
}

GameRemote.prototype.kick = function(uid,cb) {
	console.log("user leave : "+uid)
	if(GameRemote.userMap[uid] != undefined){
		var roomId = GameRemote.userMap[uid]
		var params = {}
		params.gid = GameRemote.roomList[roomId]
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
	if(GameRemote.userMap[uid] !== undefined){
		var roomId = GameRemote.userMap[uid]
		var params = {}
		params.gid = GameRemote.roomList[roomId]
		this.app.rpc.gameNode.remote.reconnection(null,params,uid,sid,roomId,function (flag){
			cb(flag)
		})
	}else{
		cb()
	}
}

//用户退出房间
GameRemote.prototype.userQuit = function(uid,cb) {
	var roomId = GameRemote.userMap[uid]
	if(GameRemote.RoomMap[roomId]){
		for(var index in GameRemote.RoomMap[roomId]){
			if(GameRemote.RoomMap[roomId].hasOwnProperty(index)){
				if(GameRemote.RoomMap[roomId][index].uid == uid){
					GameRemote.RoomMap[roomId].splice(index,1)
					break;
				}
			}
		}
	}
	delete GameRemote.userMap[uid]
	cb(true)
}
//分配房间号
local.getUnusedRoom = function() {
	//顺序分配房间号
	for(var i = ROOM_BEGIN_INDEX;i < ROOM_ALL_AMOUNT + ROOM_BEGIN_INDEX;i++){
		if(GameRemote.roomState[i] == true){
			return index
		}
	}
	return false
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
//var gameHandle = require('../handler/handle');
var conf = require("../../../conf/niuniuConf.js").niuConf
var tips = require("../../../conf/tips.js").tipsConf
var robotManager = require("../../../conf/robotManager.js")
var async = require("async")
var openRoomLogger = require("pomelo-logger").getLogger("openRoom-log");
var MATCHTIME = 500
var MAXMATCHTIMER = 10
var ROOMPLAYERNUM = 6
var ROOM_BEGIN_INDEX = 100000
var ROOM_ALL_AMOUNT = 10000
var matchingTimer = 0
var ENTER_RATE = 100
//console.log(conf)
module.exports = function(app) {
	return new GameRemote(app);
};
var local = {}
var gameType = {
	"goldMingpai-1-gold" : 10,
	"goldMingpai-2-gold" : 50,
	"goldMingpai-3-gold" : 100,
	"goldMingpai-4-gold" : 1000,
	"goldMingpai-5-gold" : 5000,
	"goldNiuNiu-1-gold" : 10,
	"goldNiuNiu-2-gold" : 50,
	"goldNiuNiu-3-gold" : 100,
	"goldNiuNiu-4-gold" : 1000,
	"goldNiuNiu-5-gold" : 5000
}

var GameRemote = function(app) {
	if(app.get("serverId") === "gold-server"){
		//console.log(app)
		console.log("init gold server!!!!")
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
		//玩家开房标记
		GameRemote.roomInitiativeFlag = {}
		GameRemote.roomInitiativeBasic = {}
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
			GameRemote.roomInitiativeFlag[i] = false
		}
		//开启定时匹配
		matchingTimer = setTimeout(local.matching,10000)
	}
};
//用户连接
GameRemote.prototype.userConnect = function(uid,sid,cb) {
	GameRemote.userConnectorMap[uid] = sid
	if(cb){
		cb()
	}
}


GameRemote.prototype.receive = function(uid, sid,code,params,cb) {
	console.log(params)
	var self = this
	switch(code){
		case "joinMatch" :
			local.joinMatch(parseInt(uid),sid,params,cb)
		return
		case "leaveMatch" :
			local.leaveMatch(uid,cb)
		return
		case "userQuit" :
			local.userQuit(uid,cb)
		return
		case "joinInitiativeRoom":
			local.joinInitiativeRoom(uid,params.roomId,cb)
		return
		case "createInitiativeRoom":
			local.createInitiativeRoom(uid,params,cb)
		return
		default : 
			if(GameRemote.userMap[uid] !== undefined){
				var roomId = GameRemote.userMap[uid];
				if(roomId != undefined){
					if(!params){
						params = {}
					}
					params.gid = GameRemote.roomList[roomId]
					self.app.rpc.goldNode.remote.receive(null,params,uid,sid,roomId,code,function (flag){
						cb(flag)
					})
				}else{
				    cb(false)
				}
			}
			else{
				cb(false)
			}
		return	
	}
}


//将队首玩家加入房间
local.joinRoom = function(type,roomId){
	var params = {}
	params.gid = GameRemote.roomList[roomId]
	if(!params.gid && params.gid != 0){
		console.log("error!!!!!!!!!!!!")
		//console.log(GameRemote.roomList)
		return
	}
	console.log("joinRoom")
	//从匹配队列删除
	var uid = GameRemote.matchList[type][0]
	GameRemote.RoomMap[roomId].push(uid)
	GameRemote.userMap[uid] = roomId	
	if(GameRemote.matchMap[uid]){
		var info = GameRemote.matchMap[uid].info
		GameRemote.matchList[type].splice(0,1)
		delete GameRemote.matchMap[uid]		
		//玩家加入房间
		var player = {
			"uid" : uid,
			"sid" : GameRemote.userConnectorMap[uid],
			"info" : info
		}
		GameRemote.app.rpc.goldNode.remote.joinRoom(null,params,player,roomId,function(flag) {
			if(!flag){
				console.log("删除队首玩家，匹配失败222222")
				//失败移除玩家
				for(var i = 0; i < GameRemote.RoomMap[roomId].length;i++){
					if(GameRemote.RoomMap[roomId][i] == uid){
						GameRemote.RoomMap[roomId].splice(i,1)
						break
					}
				}
				delete GameRemote.userMap[uid]
			}
		})
	}else{
		console.log("删除队首玩家，匹配失败")
		console.log(GameRemote.matchMap[uid])
		GameRemote.matchList[type].splice(0,1)
		delete GameRemote.matchMap[uid]
	}
}
//创建房间
local.createRoom = function(type) {
	console.log("create Room : "+type)
	var playerList = GameRemote.matchList[type]
	if(playerList.length >= ROOMPLAYERNUM){
		//凑整房间人数
		var roomCount = Math.floor(playerList.length / ROOMPLAYERNUM)
		for(var i = 0; i < roomCount; i++){
			var roomId = local.getUnusedRoom()
			var users = []
			var sids = []
			var infos = []
			for(var j = 0;j < ROOMPLAYERNUM;j++){
				users.push(playerList[j])
				sids.push(GameRemote.userConnectorMap[users[j]])
				//冗余保护  有玩家在房间中则撤销此操作
				if(GameRemote.userMap[users[j]]){
					playerList.splice(j,1)
					console.log("error22222!!!")
					break;
				}
			}
			for(var j = 0;j < users.length;j++){
				if(GameRemote.matchMap[users[j]]){
					infos.push(GameRemote.matchMap[users[j]].info)
					delete GameRemote.matchMap[users[j]]
					GameRemote.userMap[users[j]] = roomId
				}else{
					users.splice(j,1)
					j--
				}
				playerList.splice(0,1)
			}
			//创建金币场
			local.goldNodeNewRoom(users,sids,infos,roomId,type)
			// console.log("createRoom")
			// console.log(users)
		}
	}else if(playerList.length > 0 && playerList.length < ROOMPLAYERNUM){
		//人数不足一个房间
		var roomId = local.getUnusedRoom()
		var users = []
		var sids = []
		var infos = []
		var playerTmpCount = playerList.length
		for(var j = 0;j < playerTmpCount;j++){
			users.push(playerList[j])
			sids.push(GameRemote.userConnectorMap[users[j]])
			//冗余保护  有玩家在房间中则撤销此操作
			if(GameRemote.userMap[users[j]]){
				//console.log(GameRemote.userMap)
				//console.log(users[j])
				playerList.splice(j,1)
				console.log("error3333333!!!")
				return;
			}
		}
		for(var j = 0;j < users.length;j++){
			if(GameRemote.matchMap[users[j]]){
				infos.push(GameRemote.matchMap[users[j]].info)
				delete GameRemote.matchMap[users[j]]
				GameRemote.userMap[users[j]] = roomId
			}else{
				users.splice(j,1)
				j--
			}
			playerList.splice(0,1)
		}
		//创建金币场
		local.goldNodeNewRoom(users,sids,infos,roomId,type)
		//console.log("createRoom")
		//console.log(users)
	}
}
//通知游戏服务器创建房间创建成功
local.goldNodeNewRoom = function(users,sids,infos,roomId,type) {
	var params = {}
	GameRemote.NodeNumber++
	GameRemote.roomState[roomId] = false
	var nodeLength = GameRemote.app.getServersByType('goldNode').length
	if(GameRemote.NodeNumber >= nodeLength){
		GameRemote.NodeNumber = 0
	}
	params.gid = GameRemote.NodeNumber
	params.gameType = type
	params.rate = gameType[type]
	//console.log(infos)
	GameRemote.app.rpc.goldNode.remote.newRoom(null,params,users,sids,infos,roomId,function(flag,players,roomId) {
		if(flag == true){
			GameRemote.roomList[roomId] = params.gid
			GameRemote.roomInitiativeFlag[roomId] = false
			console.log("GameRemote.roomList[roomId]  :  "+GameRemote.roomList[roomId])
			GameRemote.typeRoomMap[type].push(roomId)
			GameRemote.roomTypeMap[roomId] = type
			GameRemote.RoomMap[roomId] = users
			console.log("users : "+users)
		}else{
			//TODO通知匹配失败 删除RoomMap与userMap
			delete GameRemote.RoomMap[roomId]
			GameRemote.roomState[roomId] = true
			for(var z in players){
				if(players.hasOwnProperty(z)){
					delete GameRemote.userMap[players[z]]
				}
			}
		}
	})
}
//用户被踢出房间
GameRemote.prototype.userOutRoom = function(roomId,uid,cb) {
	local.quitRoom(roomId,uid)
	//通知玩家
	var notify = {
		"cmd" : "userOutRoom"
	}
	GameRemote.prototype.sendByUid(uid,notify,function(){})
	if(cb){
		cb()
	}
}

//用户退出房间
local.quitRoom = function(roomId,uid) {
	console.log("roomId222 : "+roomId)
	console.log("quitRoom222 : "+uid)
	console.log(GameRemote.RoomMap[roomId])
	for(var i = 0; i < GameRemote.RoomMap[roomId].length;i++){
		if(GameRemote.RoomMap[roomId][i] == uid){
			GameRemote.RoomMap[roomId].splice(i,1)
			break
		}
	}
	delete GameRemote.userMap[uid]
	robotManager.freeRobot(uid)
	console.log(GameRemote.userMap)
}

//用户中途离开房间
local.userQuit = function(uid,cb) {
	console.log("userQuit")
	var roomId = GameRemote.userMap[uid]
	console.log("roomId : "+roomId)
	if(!roomId){
		cb(false)
		return
	}
	var params = {}
	params.gid = GameRemote.roomList[roomId]
	console.log("params.gid : "+params.gid)
	GameRemote.app.rpc.goldNode.remote.quitRoom(null,params,uid,function(flag){
		console.log(flag)
		if(flag == true){
			local.quitRoom(roomId,uid)
		}
		cb(flag)
	})
}

//定时匹配
local.matching = function(){
	// console.log("matching")
	clearTimeout(matchingTimer)
	matchingTimer = setTimeout(local.matching,MATCHTIME)
	for(var type in gameType){
		if(gameType.hasOwnProperty(type)){
			//匹配队列玩家列表
			var playerList = GameRemote.matchList[type]
			// console.log(playerList)
			//已有房间列表
			var tmpRoomList = GameRemote.typeRoomMap[type]
			// console.log(tmpRoomList)
			//遍历每个玩家    先随机选择一个房间加入
			for(var i = 0; i < playerList.length;i++){
				//是否有空闲房间标志
				var tmpFlag = false
				var roomId = false
				var tmpRand = Math.floor(Math.random() * tmpRoomList.length) % tmpRoomList.length
				for(var j = tmpRand;j < tmpRand + tmpRoomList.length;j++){
					roomId = tmpRoomList[j % tmpRoomList.length]
					var playerCount = GameRemote.RoomMap[roomId].length
					if(playerCount < ROOMPLAYERNUM){
						tmpFlag = true
						break
					}
				}
				if(tmpFlag){
					//有空闲房间则加入
					GameRemote.matchTimer[type] = 0
					local.joinRoom(type,roomId)
				}
			}
			//若该类型还有剩余玩家、尝试创建新房间
			if(playerList.length > 0){
				GameRemote.matchTimer[type]++
				if(playerList.length >= ROOMPLAYERNUM || GameRemote.matchTimer[type] >= MAXMATCHTIMER){
					GameRemote.matchTimer[type] = 0
					//匹配成功的玩家开始匹配
					local.createRoom(type)
				}else{
					//加一个机器人到队列中
					var robotId = robotManager.getUnusedRobot()
					if(robotId && Math.random() < 0.4){
						robotManager.getRobotInfo(type,robotId,function(robotData,robotType) {
							var params = {"gameType" : robotType,"ip" : "0.0.0.0"}
							local.robotJoinMatch(robotData.uid,params,robotData)
						})
					}
				}
			}
			//给空闲房间动态添加机器人
			for(var i = 0;i < tmpRoomList.length; i++){
				var roomId = tmpRoomList[i]
				var playerCount = GameRemote.RoomMap[roomId].length
				// console.log("roomId : " + roomId)
				// console.log("playerCount : " + playerCount)
				var tmpFlag = false
				var rand = Math.random()
				if(playerCount < ROOMPLAYERNUM - 2 && rand < 0.2){
					tmpFlag = true
				}else if(playerCount < ROOMPLAYERNUM - 1 && rand < 0.05){
					tmpFlag = true
				}else if(playerCount < ROOMPLAYERNUM && rand < 0.01){
					tmpFlag = true
				}
				if(tmpFlag){
					var robotId = robotManager.getUnusedRobot()
					if(robotId){
						robotManager.getRobotInfo(type,robotId,function(robotData,robotType) {
							var params = {"gameType" : robotType,"ip" : "0.0.0.0"}
							local.robotJoinMatch(robotData.uid,params,robotData)
						})
					}					
				}
			}
		}
	}
}
//机器人加入匹配队列
local.robotJoinMatch = function(uid,params,robotData) {
	var type = params.gameType
	if(!type || typeof(type) != "string" || !gameType[type]){
		console.log("params.gameType error : "+type)
		return
	}
	//在匹配队列中不能再次申请
	if(GameRemote.matchMap[uid]){
		console.log("can't join Match user in match: "+GameRemote.matchMap[uid].type + "   uid : "+uid)
		return
	}
	//在房间中不能申请
	if(GameRemote.userMap[uid]){
		console.log("can't join Match user in room: "+GameRemote.userMap[uid] + "   uid : "+uid)
		return
	}
	//检测金币
	if(robotData.gold < 10){
		return
	}
	GameRemote.matchList[type].push(uid)
	GameRemote.matchMap[uid] = {"type" : type,"info" : robotData}
}

//加入匹配队列
local.joinMatch = function(uid,sid,params,cb) {
	var type = params.gameType
	if(!type || typeof(type) != "string" || !gameType[type]){
		console.log("params.gameType error : "+type)
		cb(false)
		return
	}
	//在匹配队列中不能再次申请
	if(GameRemote.matchMap[uid]){
		console.log("can't join Match user in match: "+GameRemote.matchMap[uid].type + "   uid : "+uid)
		console.log(GameRemote.matchList)
		console.log(GameRemote.matchMap)
		cb(false,{"msg" : tips.IN_MATCHING})
		return
	}
	//在房间中不能申请
	if(GameRemote.userMap[uid]){
		//若进入同一类型房间则重连
		var roomId = GameRemote.userMap[uid]
		console.log(GameRemote.roomTypeMap[GameRemote.userMap[uid]])
		console.log(type)
		if(GameRemote.roomTypeMap[GameRemote.userMap[uid]] == type){
			var tmpParams = {}
			tmpParams.gid = GameRemote.roomList[roomId]
			GameRemote.app.rpc.goldNode.remote.reconnection(null,tmpParams,uid,sid,roomId,function(data) {
				if(data){
					console.log("reconnection ok")
					console.log(data)
					cb(true,{"code" : "reconnection","data" : data})
				}else{
					console.log("重连失败")
					cb(false,{"msg" : tips.WAIT_GAME_OVER})					
				}
			})
			return
		}else{
			console.log("can't join Match user in room: "+GameRemote.userMap[uid] + "   uid : "+uid)
			cb(false,{"msg" : tips.WAIT_GAME_OVER})
			return
		}
	}

	//获取用户信息、检测金币
	GameRemote.app.rpc.db.remote.getPlayerInfoByUid(null,uid,function(data) {
		if(data !== false){
			//检测金币或钻石
			if(type.split("-")[2] == "gold"){
				if(data.gold < gameType[type] * 100){
					cb(false,{"msg" : tips.NO_GOLD})
					return
				}
				if(gameType[type] !== 5000 && data.gold > gameType[type] * 1000){
					cb(false,{"msg" : tips.MORE_GOLD})
					return
				}				
			}else if(type.split("-")[2] == "diamond"){
				if(data.diamond < gameType[type] * 100){
					cb(false,{"msg" : tips.NO_DIAMOND})
					return
				}
				if(gameType[type]!== 5000 && data.diamond > gameType[type] * 1000){
					cb(false,{"msg" : tips.MORE_DIAMOND})
					return
				}
			}else{
				cb(false)
				return
			}
			GameRemote.matchList[type].push(uid)
			//console.log(GameRemote.matchList[type])
			data.ip = params.ip
			delete data.history
			GameRemote.matchMap[uid] = {"type" : type,"info" : data}
			cb(true)
		}else{
			cb(false)
		}
	})
}
//离开匹配队列
local.leaveMatch = function(uid,cb) {
	if(!GameRemote.matchMap[uid]){
		cb(false)
		return
	}
	//查找匹配位置
	var type = GameRemote.matchMap[uid].type
	for(var i = 0; i < GameRemote.matchList[type].length; i++){
		if(GameRemote.matchList[type][i] == uid){
			//查找成功   从匹配队列删除
			GameRemote.matchList[type].splice(i,1)
			delete GameRemote.matchMap[uid]
			cb(true)
			return
		}
	}
	console.log("error leaveMatch can't find target ! " + type)
	cb(false)
}

//直接加入游戏
local.joinInitiativeRoom = function(uid,roomId,cb) {
	//在匹配队列中不能再次创建
	if(GameRemote.matchMap[uid]){
		console.log("can't newRoom user in match: "+GameRemote.matchMap[uid].type + "   uid : "+uid)
		console.log(GameRemote.matchList)
		console.log(GameRemote.matchMap)
		cb(false,{"msg" : tips.IN_MATCHING})
		return
	}
	//在房间中不能加入
	if(GameRemote.userMap[uid]){
		console.log("can't newRoom user in room: "+GameRemote.userMap[uid] + "   uid : "+uid)
		cb(false,{"msg" : tips.WAIT_GAME_OVER})
		return
	}
	//非玩家主动创房不能加入
	if(!GameRemote.roomInitiativeFlag[roomId]){
		cb(false,{"msg" : tips.NO_ROOM})
		return		
	}
	//获取用户信息、检测金币
	GameRemote.app.rpc.db.remote.getPlayerInfoByUid(null,uid,function(data) {
		if(data !== false){
			if(data.gold < GameRemote.roomInitiativeBasic[roomId] * ENTER_RATE){
				cb(false,{"msg" : tips.NO_DIAMOND})
				return
			}
			var params = {}
			params.gid = GameRemote.roomList[roomId]			
			var player = {
				"uid" : uid,
				"sid" : GameRemote.userConnectorMap[uid],
				"info" : data
			}
			GameRemote.app.rpc.goldNode.remote.joinRoom(null,params,player,roomId,function(flag) {
				if(flag == true){
					GameRemote.RoomMap[roomId].push(uid)
					GameRemote.userMap[uid] = roomId
					cb(true)
				}else{
					cb(false)
				}
			})			
		}else{
			cb(false)
		}
	})
}

//创建新房间
local.createInitiativeRoom = function(uid,params,cb) {
	var type = params.gameType
	var rate = params.rate
	var gid
	//预判断房间倍率
	if(!rate || typeof(rate) !== "number" || rate < 10 || rate > 5000){
		console.log("params.rate error : "+rate)
		cb(false)
		return
	}		
	//在匹配队列中不能再次创建
	if(GameRemote.matchMap[uid]){
		console.log("can't newRoom user in match: "+GameRemote.matchMap[uid].type + "   uid : "+uid)
		console.log(GameRemote.matchList)
		console.log(GameRemote.matchMap)
		cb(false,{"msg" : tips.IN_MATCHING})
		return
	}
	//在房间中不能创建
	if(GameRemote.userMap[uid]){
		console.log("can't newRoom user in room: "+GameRemote.userMap[uid] + "   uid : "+uid)
		cb(false,{"msg" : tips.WAIT_GAME_OVER})
		return
	}
	//获取用户信息、检测金币
	GameRemote.app.rpc.db.remote.getPlayerInfoByUid(null,uid,function(data) {
		if(data !== false){
			if(data.gold < rate * ENTER_RATE){
				cb(false,{"msg" : tips.NO_GOLD})
				return
			}

			var roomId = local.getUnusedRoom()
			GameRemote.roomState[roomId] = false

			GameRemote.NodeNumber++
			var nodeLength = GameRemote.app.getServersByType('goldNode').length
			if(GameRemote.NodeNumber >= nodeLength){
				GameRemote.NodeNumber = 0
			}
			params.gid = GameRemote.NodeNumber
			gid = params.gid
			var users = [uid]
			var sids = [GameRemote.userConnectorMap[uid]]
			var infos = [data]
			GameRemote.app.rpc.goldNode.remote.createRoom(null,params,users,sids,infos,rate,roomId,function(flag,players,roomId) {
				if(flag == true){
					GameRemote.roomList[roomId] = gid
					GameRemote.roomInitiativeFlag[roomId] = true
					GameRemote.roomInitiativeBasic[roomId] = rate
					GameRemote.RoomMap[roomId] = users
					GameRemote.userMap[uid] = roomId
					cb(true)
				}else{
					//TODO通知匹配失败 删除RoomMap与userMap
					delete GameRemote.RoomMap[roomId]
					GameRemote.roomState[roomId] = true
					cb(false)
				}
			})
		}else{
			cb(false)
		}
	})
}

//游戏结束回调
GameRemote.prototype.gameOver = function(roomId,players,type,cb) {
	//解锁房间内玩家   清理房间  更新代开房记录
	for(var index in players){
		if(players.hasOwnProperty(index)){
			if(players[index].isActive){
                delete GameRemote.userMap[players[index].uid]
			}
		}
	}
	GameRemote.roomState[roomId] = true
	GameRemote.roomList[roomId] = false
	GameRemote.roomInitiativeFlag[roomId] = false
	delete GameRemote.RoomMap[roomId]
	delete GameRemote.roomTypeMap[roomId]
	console.log(GameRemote.typeRoomMap[type])
	//自动匹配房间才需要处理
	if(GameRemote.typeRoomMap[type]){
		for(var i = 0; i < GameRemote.typeRoomMap[type].length;i++){
			if(GameRemote.typeRoomMap[type][i] == roomId){
				GameRemote.typeRoomMap[type].splice(i,1)
				console.log(GameRemote.typeRoomMap[type])
				break
			}
		}		
	}
	if(cb){
		cb()
	}
}

//游戏开始回调
GameRemote.prototype.gameBeginCB = function(roomId,agencyId,cb) {
	//console.log("gameBeginCB========== agencyId : "+agencyId)
	if(cb){
		cb()
	}
}

GameRemote.prototype.kick = function(uid,cb) {
	//若玩家在匹配队列中离开匹配
	if(GameRemote.matchMap[uid]){
		local.leaveMatch(uid,function(){})
	}
	console.log("user leave : "+uid)
	if(GameRemote.userMap[uid] != undefined){
		var roomId = GameRemote.userMap[uid]
		var params = {}
		params.gid = GameRemote.roomList[roomId]
		this.app.rpc.goldNode.remote.disconnect(null,params,uid,null,roomId,function (flag){
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
		if(!roomId){
			cb()
			return
		}
		var params = {}
		params.gid = GameRemote.roomList[roomId]
		this.app.rpc.goldNode.remote.reconnection(null,params,uid,sid,roomId,function (data){
			cb(data)
		})
	}else{
		cb()
	}
}

//分配房间号
local.getUnusedRoom = function() {
	//随机分配房间号
	var rand = Math.floor(Math.random() * ROOM_ALL_AMOUNT)
	for(var i = rand;i < ROOM_ALL_AMOUNT + rand;i++){
		var roomId = i % (ROOM_ALL_AMOUNT) + ROOM_BEGIN_INDEX
		if(GameRemote.roomState[roomId] == true){
			return roomId
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
//var gameHandle = require('../handler/handle');
var conf = require("../../../conf/niuniuConf.js").niuConf
var tips = require("../../../conf/tips.js").tipsConf
var async = require("async")
var openRoomLogger = require("pomelo-logger").getLogger("openRoom-log");
var MATCHTIME = 5000
var MAXMATCHTIMER = 1
var ROOMPLAYERNUM = 6
var ROOM_BEGIN_INDEX = 100000
var ROOM_ALL_AMOUNT = 10000
//console.log(conf)
module.exports = function(app) {
	return new GameRemote(app);
};
var local = {}
var gameType = {
	"niuniu" : true
}
var roomIndex = 0

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
	}
};
//用户连接
GameRemote.prototype.userConnect = function(uid,sid,cb) {
	GameRemote.userConnectorMap[uid] = sid
	if(cb){
		cb()
	}
}
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
		var params = {}
		params.gid = GameRemote.roomList[roomId]
		if(!params.gid){
			cb(false)
			return
		}
		var uid = GameRemote.matchList[type][0]
		GameRemote.matchList[type].splice(0,1)
		//冗余保护  若玩家已在房间中则不处理
		if(GameRemote.userMap[uid]){
			return
		}
		var player = {
			"uid" : uid,
			"sid" : GameRemote.userConnectorMap[uid]
		}
		GameRemote.app.rpc.goldNode.remote.joinRoom(null,params,player,roomId,function(flag) {
			if(flag == true){
				GameRemote.RoomMap[roomId].push(uid)
				GameRemote.userMap[uid] = roomId
			}
		})
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
			for(var j = 0;j < ROOMPLAYERNUM;j++){
				users.push(GameRemote.matchList[type][j])
				sids.push(GameRemote.userConnectorMap[users[j]])
				//冗余保护  有玩家在房间中则撤销此操作
				if(GameRemote.userMap[users[j]]){
					GameRemote.matchList[type].splice(j,1)
					break;
				}
			}
			GameRemote.RoomMap[roomId] = {}
			for(var j = 0;j < ROOMPLAYERNUM;j++){
				delete GameRemote.matchMap[users[j]]
				GameRemote.matchList[type].splice(0,1)
				GameRemote.RoomMap[roomId][j] = users[j]
				GameRemote.userMap[users[j]] = roomId
			}
			//创建金币场
			local.goldNodeNewRoom(users,sids,roomId)
			console.log("createRoom")
			console.log(users)
		}
	}else if(playerList.length > 0 && playerList.length < ROOMPLAYERNUM){
		//人数不足一个房间补足机器人
		var roomId = local.getUnusedRoom()
		var users = []
		var sids = []
		GameRemote.RoomMap[roomId] = {}
		for(var j = 0;j < playerList.length;j++){
			users.push(GameRemote.matchList[type][j])
			sids.push(GameRemote.userConnectorMap[users[j]])
			GameRemote.matchList[type].splice(0,1)
			//冗余保护  有玩家在房间中则撤销此操作
			if(GameRemote.userMap[users[j]]){
				GameRemote.matchList[type].splice(j,1)
				return;
			}
		}
		for(var j = 0;j < users.length;j++){
			delete GameRemote.matchMap[users[j]]
			GameRemote.matchList[type].splice(0,1)
			GameRemote.RoomMap[roomId][j] = users[j]
			GameRemote.userMap[users[j]] = roomId
		}
		//创建金币场
		local.goldNodeNewRoom(users,sids,roomId)
		console.log("createRoom")
		console.log(users)		
	}		
}
//通知游戏服务器创建房间创建成功
local.goldNodeNewRoom = function(users,sids,roomId) {
	var params = {}
	GameRemote.NodeNumber++
	var nodeLength = GameRemote.app.getServersByType('goldNode').length
	if(GameRemote.NodeNumber >= nodeLength){
		GameRemote.NodeNumber = 0
	}
	params.gid = GameRemote.NodeNumber
	GameRemote.app.rpc.goldNode.remote.newRoom(null,params,users,sids,roomId,function(flag,players,roomId) {
		if(flag == true){
			GameRemote.roomList[roomId] = params.gid
		}else{
			//TODO通知匹配失败 删除RoomMap与userMap
			delete GameRemote.RoomMap[roomId]
			for(var z in players){
				if(players.hasOwnProperty(z)){
					delete GameRemote.userMap[players[z]]
				}
			}
		}
	})
}

//用户退出房间
local.quitRoom = function(roomId,uid) {
	console.log("quitRoom")
	for(var i in GameRemote.RoomMap[roomId]){
		if(GameRemote.RoomMap[roomId].hasOwnProperty(i)){
			if(GameRemote.RoomMap[roomId][i] == uid){
				delete GameRemote.RoomMap[roomId][i]
				delete GameRemote.userMap[uid]
				return
			}
		}
	}
}

local.userQuit = function(uid,cb) {
	console.log("userQuit")
	var roomId = GameRemote.userMap[uid]
	if(!roomId){
		cb(false)
		return
	}
	var params = {}
	params.gid = GameRemote.roomList[roomId]
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
	//console.log("matching")
	for(var type in gameType){
		if(gameType.hasOwnProperty(type)){
			//匹配队列玩家列表
			var playerList = GameRemote.matchList[type]
			console.log(playerList)
			//已有房间列表
			var tmpRoomList = GameRemote.typeRoomMap[type]
			//从该类型的所有房间中找空闲房间
			var runTime = 0
			for(var i = 0;i < tmpRoomList.length; i++){
				runTime = 0
				if(playerList.length <= 0){
					//等待队列空时结束本次匹配
					return
				}
				var roomId = tmpRoomList[i]
				do{
					runTime++
					var playerCount = GameRemote.RoomMap[roomId].length
					local.joinRoom(type,roomId)
					GameRemote.matchTimer[type] = 0					
				}while(playerCount < ROOMPLAYERNUM && playerList.length > 0 && runTime < 100)
			}
			if(playerList.length > 0 && runTime < 100){
				//已有房间已满   尝试创建新房间
				GameRemote.matchTimer[type]++
				console.log("GameRemote.matchTimer[type] : "+GameRemote.matchTimer[type])
				//人数超过6人或匹配次数到达预计则开始游戏
				if(playerList.length >= ROOMPLAYERNUM || GameRemote.matchTimer[type] >= MAXMATCHTIMER){
					GameRemote.matchTimer[type] = 0
					//匹配成功的玩家开始匹配
					local.createRoom(type)
				}
			}
		}
	}
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
		console.log("can't join Match user in match: "+GameRemote.matchMap[uid] + "   uid : "+uid)
		cb(false)
		return
	}
	//在房间中不能申请
	if(GameRemote.userMap[uid]){
		console.log("can't join Match user in room: "+GameRemote.userMap[uid] + "   uid : "+uid)
		cb(false)
		return		
	}
	GameRemote.matchList[type].push(uid)
	GameRemote.matchMap[uid] = type
	cb(true)
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

GameRemote.prototype.receive = function(uid, sid,code,params,cb) {
	console.log(params)
	var self = this
	switch(code){
		case "joinMatch" :
			local.joinMatch(uid,sid,params,cb)
		break
		case "leaveMatch" :
			local.leaveMatch(uid,cb)
		break
		case "userQuit" :
			local.userQuit(uid,cb)
		break 
		default : 
			cb(false)
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

//分配房间号
local.getUnusedRoom = function() {
	//顺序分配房间号
	for(var i = ROOM_BEGIN_INDEX;i < ROOM_ALL_AMOUNT + ROOM_BEGIN_INDEX;i++){
		if(GameRemote.roomState[i] == true){
			return i
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
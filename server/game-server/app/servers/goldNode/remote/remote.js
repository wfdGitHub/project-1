var conf = require("../../../conf/niuniuConf.js").niuConf
var tips = require("../../../conf/tips.js").tipsConf
var goldMingpai = require("../../../goldGames/goldMingpai.js")
var goldLogger = require("pomelo-logger").getLogger("goldRoom-log")
var async = require("async")

var ROOM_FACTORY = {
	"goldMingpai" : goldMingpai
}

module.exports = function(app) {
	return new GameRemote(app);
}

var GameRemote = function(app) {
	this.app = app
	GameRemote.app = app
	GameRemote.channelService = this.app.get('channelService');
}

var local = {}
GameRemote.roomList = {}
GameRemote.userMap = {}
GameRemote.liveTimer = {}
//新建房间
GameRemote.prototype.newRoom = function(params,uids,sids,infos,roomId,cb) {
	if(!ROOM_FACTORY[params.gameType]){
		cb(false)
		return
	}
	GameRemote.roomList[roomId] = ROOM_FACTORY[params.gameType].createRoom(roomId,GameRemote.channelService,local.settlementCB,local.gemeOver)
    GameRemote.roomList[roomId].handle.newRoom(uids,sids,infos,function (flag) {
		if(flag){
			var info = "   newRoom   gold roomId  : "+ roomId
			goldLogger.info(info)
			console.log(uids)
			for(var i = 0;i < uids.length;i++){
				GameRemote.userMap[uids[i]] = roomId
			}
			//房间计时器
			clearTimeout(GameRemote.liveTimer[roomId])
			GameRemote.liveTimer[roomId] = setTimeout(finishGameOfTimer(roomId),8 * 60 * 60 * 1000)
			cb(true,uids,roomId)
		}else{
			delete GameRemote.roomList[roomId]
			cb(false)
		}
    })
}

//加入房间
GameRemote.prototype.joinRoom = function(params,player,roomId,cb) {
	console.log(player)
	if(!GameRemote.roomList[roomId]){
		goldLogger.info("joinError!!!!!!!")
		cb(false)
		return
	}
	GameRemote.roomList[roomId].handle.join(player.uid,player.sid,player.info,function(flag){
		if(flag){
			GameRemote.userMap[player.uid] = roomId
			console.log("joinRoom : ")
			console.log(player)
		}
		cb(flag)
	})
}

//离开房间
GameRemote.prototype.quitRoom = function(params,uid,cb) {
	console.log("goldNode quitRoom")
	var roomId = GameRemote.userMap[uid]
	if(!roomId){
		cb(false)
		return
	}
	GameRemote.roomList[roomId].userQuit(uid,function(flag) {
		if(flag){
			console.log("quitRoom : ")
			console.log(uid)
			local.quitRoom(uid)
		}
		cb(flag)
	})
}

//玩家退出房间回调
local.quitRoom = function(uid) {
	delete GameRemote.userMap[uid]
}

//玩家重连
GameRemote.prototype.reconnection = function(params,uid,sid,roomId,cb) {
	var freeState = false
	if(freeFrame.GameService.roomLock[roomId] === false){
		freeState = freeFrame.GameService.lockState[roomId]
	}
	GameRemote.roomList[roomId].reconnection(uid,sid,freeState,function(data) {
		cb(data)
	})
}
//房间指令
GameRemote.prototype.receive = function(params,uid,sid,roomId,code,cb) {
	if(GameRemote.roomList[roomId].handle[code]){
		GameRemote.roomList[roomId].handle[code](uid,sid,params,cb)
	}else{
		cb(false)
	}
}
//房间超时回调
var finishGameOfTimer = function(index) {
	return function() {
		if(GameRemote.roomList[index].isFree()){
			//房间空闲则解散
			//记录日志
			var info = "finishGameOfTimer   gold Room finish   roomId  : "+ index
			goldLogger.info(info)
			GameRemote.roomList[index].finishGame(true)
		}else{
			//正在游戏中则过一段时间后再次发起再次解散
			GameRemote.liveTimer[index] = setTimeout(finishGameOfTimer(index),1 * 60 * 60 * 1000)
		}
	}
}

//小结算回调
local.settlementCB = function(curScores) {
	// TODO
	console.log(curScores)
}

//房间结束回调
local.gemeOver = function() {
	// body...
}
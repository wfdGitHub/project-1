var conf = require("../../../conf/niuniuConf.js").niuConf
var tips = require("../../../conf/tips.js").tipsConf
var solitaireLogger = require("pomelo-logger").getLogger("solitaire-log")


module.exports = function(app) {
	return new GameRemote(app);
}

var GameRemote = function(app) {
	this.app = app
	GameRemote.app = app
	GameRemote.channelService = this.app.get('channelService');
}



var ROOM_TYPE = {
	"flop" : true
}

var local = {}
//房间列表
GameRemote.roomList = {}
//玩家映射表
GameRemote.userMap = {}
//房间存活计时器
GameRemote.liveTimer = {}



//创建单人房间
GameRemote.prototype.createRoom = function(params,uid,sid,info,roomId,cb) {
	if(!ROOM_TYPE[params.gameType]){
		cb(false)
		return
	}
	GameRemote.roomList[roomId] = ROOM_TYPE[params.gameType].createRoom(roomId,GameRemote.channelService,local.beginCB,local.settlementCB,local.gemeOver)
	GameRemote.userMap[uid] = roomId
	clearTimeout(GameRemote.liveTimer[roomId])
	GameRemote.liveTimer[roomId] = setTimeout(finishGameOfTimer(roomId),1 * 60 * 1000)	
	//记录日志
	solitaireLogger.info("uid : "+uid+" createRoom : "+params.gameType)
}

//游戏开始回调
local.beginCB = function(roomId) {
	console.log(roomId+ " : roomId game begin")
}

//小结算回调
local.settlementCB = function(roomId) {
	console.log(roomId+" : roomId game settlement")
}

//房间结束回调
local.gemeOver = function(roomId) {
console.log(roomId+" : roomId game gemeOver")
}


//房间超时回调
var finishGameOfTimer = function(index) {
	return function() {
		//房间内无在线玩家则解散
		if(!GameRemote.roomList[index].isHaveHumen()){
			//房间空闲则解散
			//记录日志
			var info = "finishGameOfTimer   gold Room finish   roomId  : "+ index
			solitaireLogger.info(info)
			GameRemote.roomList[index].finishGame(true)
		}else{
			//正在游戏中则过一段时间后再次发起再次解散
			GameRemote.liveTimer[index] = setTimeout(finishGameOfTimer(index),1 * 60 * 1000)
		}
	}
}
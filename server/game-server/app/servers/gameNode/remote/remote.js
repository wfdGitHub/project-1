var conf = require("../../../conf/niuniuConf.js").niuConf
var tips = require("../../../conf/tips.js").tipsConf
var NiuNiu = require("../../../games/NiuNiu.js")
var ZhaJinNiu = require("../../../games/ZhaJinNiu.js")
var MingPaiQZ = require("../../../games/MingPaiQZ.js")
var FengKuang = require("../../../games/FengKuang.js")
var openRoomLogger = require("pomelo-logger").getLogger("openRoom-log")
var streamLogger = require("pomelo-logger").getLogger("matchStream-log")
var httpConf = require("../../../conf/httpModule.js")
var freeFrame = require("./freeFrame.js")
var async = require("async")


var ROOM_FACTORY = {
	"mingpaiqz" : MingPaiQZ
}

var MODE_DIAMOND_HOST = 1              //房主扣钻
var MODE_DIAMOND_EVERY = 2             //每人扣钻
var MODE_DIAMOND_WIN = 3               //大赢家扣钻

module.exports = function(app) {
	return new GameRemote(app);
}

var local = {}
var GameRemote = function(app) {
	this.app = app
	GameRemote.app = app
	GameRemote.channelService = this.app.get('channelService');
	freeFrame.start(GameRemote)
}

GameRemote.roomList = {}
GameRemote.userMap = {}
//房间生存计时器(时间到后自动解散房间)
GameRemote.liveTimer = {}
//房间锁定状态   用户请求解散房间会锁定房间
GameRemote.roomLock = {}
//玩家对应响应状态
GameRemote.lockState = {}
//解散请求计时器
GameRemote.lockTimer = {}
//新建房间
GameRemote.prototype.newRoom = function(params,uid,sid,roomId,cb) {
	console.log("rid : "+roomId+"    uid : "+uid)
	console.log(params)
	if(!ROOM_FACTORY[params.gameType]){
		cb(false)
		return
	}
	GameRemote.roomList[roomId] = ROOM_FACTORY[params.gameType].createRoom(roomId,GameRemote.channelService,gameBegin,gemeOver)
    GameRemote.roomList[roomId].handle.newRoom(uid,sid,params,function (flag) {
    	if(flag){
			var info = "   newRoom   roomId  : "+ roomId + "    uid : "+uid+ "   gameType : "+params.gameType + "   gameNumber : "+params.gameNumber
			openRoomLogger.info(info)
			GameRemote.userMap[uid] = roomId
			//房间计时器
			clearTimeout(GameRemote.liveTimer[roomId])
			GameRemote.liveTimer[roomId] = setTimeout(finishGameOfTimer(roomId),8 * 60 * 60 * 1000)
    	}else{
    		delete GameRemote.roomList[roomId]
    	}
    	cb(flag)
    })
}

//代开房间
GameRemote.prototype.agencyRoom = function(params,uid,sid,roomId,cb) {
	console.log("rid : "+roomId+"    uid : "+uid)
	console.log(params)
	if(!ROOM_FACTORY[params.gameType]){
		cb(false)
		return
	}	
	GameRemote.roomList[roomId] = ROOM_FACTORY[params.gameType].createRoom(roomId,GameRemote.channelService,gameBegin,gemeOver)
	GameRemote.roomList[roomId].handle.agency(uid,sid,params,function (flag) {
    	if(flag){
			var info = "   agency   roomId  : "+ roomId + "    uid : "+uid+ "   gameType : "+params.gameType + "gameNumber : "+params.gameNumber
			openRoomLogger.info(info)
			//房间计时器
			clearTimeout(GameRemote.liveTimer[roomId])
			GameRemote.liveTimer[roomId] = setTimeout(finishGameOfTimer(roomId),8 * 60 * 60 * 1000)
    	}else{
    		delete GameRemote.roomList[roomId]
    	}
		cb(flag)
	})
}
//房间超时回调
var finishGameOfTimer = function(index) {
	return function() {
		if(GameRemote.roomList[index].isFree()){
			//房间空闲则解散
			//记录日志
			var info = "finishGameOfTimer   Room finish   roomId  : "+ index
			openRoomLogger.info(info)
			GameRemote.roomList[index].finishGame(true)
		}else{
			//正在游戏中则过一段时间后再次发起再次解散
			GameRemote.liveTimer[index] = setTimeout(finishGameOfTimer(index),1 * 60 * 60 * 1000)
		}
	}
}
//加入房间
GameRemote.prototype.join = function(params,uid,sid,roomId,cb) {
	var self = this
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
		switch(GameRemote.roomList[roomId].consumeMode){
			case conf.MODE_DIAMOND_HOST : 
				needMond = 0
			break;
			case conf.MODE_DIAMOND_EVERY :
				needMond = GameRemote.roomList[roomId].needDiamond
			break;
			case conf.MODE_DIAMOND_WIN : 
				needMond = GameRemote.roomList[roomId].needDiamond * 3;
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
		GameRemote.roomList[roomId].handle.join(uid,sid,{ip : ip,playerInfo : playerInfo},function (flag,code) {
			if(flag){
				GameRemote.userMap[uid] = roomId
			}
			cb(flag,{"code" : code,},playerInfo)
		})
	}
	],function(err,result) {
	//console.log(err)
	//console.log(result)
	cb(false)
	return
	})
}
//房间指令
GameRemote.prototype.receive = function(params,uid,sid,roomId,code,cb) {
	GameRemote.roomList[roomId].handle[code](uid,sid,params,cb)
}
//玩家重连
GameRemote.prototype.reconnection = function(params,uid,sid,roomId,cb) {
	var freeState = false
	if(freeFrame.GameService.roomLock[roomId] === false){
		freeState = freeFrame.GameService.lockState[roomId]
	}
	GameRemote.roomList[roomId].reconnection(uid,sid,freeState,function(flag) {
		cb(flag)
	})
}
//玩家离开
GameRemote.prototype.disconnect = function(params,uid,sid,roomId,cb) {
	GameRemote.roomList[roomId].leave(uid)
	cb(true)
}
//结束房间
GameRemote.prototype.finishRoom = function(params,roomId,cb) {
	console.log("finishRoom roomId : "+roomId)
	if(GameRemote.roomList[roomId].finishGame){
		GameRemote.roomList[roomId].finishGame()
	}
	if(cb){
		cb()
	}
}

//房间广播
GameRemote.prototype.sendAllMessge = function(params,roomId,notidy,cb) {
	GameRemote.roomList[roomId].channel.pushMessage('onMessage',notify)
	if(cb){
		cb()
	}
}
//游戏开始
var gameBegin = function(roomId,agencyId) {
	GameRemote.app.rpc.game.remote.gameBeginCB(null,roomId,agencyId,function() {})
}
//游戏结束
var gemeOver = function(roomId,players,flag,cb) {
	clearTimeout(GameRemote.liveTimer[roomId])
	console.log("gameover")
	//扣除钻石
	var roomPlayerCount = 0
	for(var index in players){
		if(players.hasOwnProperty(index)){
			if(players[index].isActive){		
                roomPlayerCount++
                delete GameRemote.userMap[players[index].uid]
			}
		}
	}
	var diamond = GameRemote.roomList[roomId].needDiamond
	var GAME_PLAYER = roomPlayerCount
	//console.log("diamond : "+diamond)
	var agencyId = GameRemote.roomList[roomId].agencyId
	var maxGameNumber = GameRemote.roomList[roomId].maxGameNumber
	if(diamond !== 0){
		switch(GameRemote.roomList[roomId].consumeMode){
			case MODE_DIAMOND_HOST: 
				GameRemote.app.rpc.db.remote.setValue(null,players[0].uid,"diamond",-(diamond * 3),null)
				httpConf.coinChangeRecord(players[0].uid,1,-(diamond * 3))
				GameRemote.app.rpc.db.remote.setValue(null,players[0].uid,"useDiamond",(diamond * 3),null)
				break;
			case MODE_DIAMOND_EVERY: 
				for(var index in players){
					if(players.hasOwnProperty(index)){
                        if(players[index].isActive){
                            GameRemote.app.rpc.db.remote.setValue(null,players[index].uid,"diamond",-diamond,null)
                            httpConf.coinChangeRecord(players[index].uid,1,-diamond)
                            GameRemote.app.rpc.db.remote.setValue(null,players[index].uid,"useDiamond",diamond,null)
                        }
					}
				}
				break;
			case MODE_DIAMOND_WIN: 
				var win = 0
				var winScore = 0
				for(var index in players){
					if(players.hasOwnProperty(index)){
                        if(players[index].isActive){
                            if(players[index].score > winScore){
                                win = index
                                winScore = players[index].score
                            }
						}
					}
				}
				GameRemote.app.rpc.db.remote.setValue(null,players[win].uid,"diamond",-(diamond * 3),null)
				httpConf.coinChangeRecord(players[win].uid,1,-(diamond * 3))
				GameRemote.app.rpc.db.remote.setValue(null,players[win].uid,"useDiamond",(diamond * 3),null)
				break;		
		}		
	}else{
		//代开房未开始则返回钻石
		if(agencyId && !GameRemote.roomList[roomId].isBegin()){
			var tmpDiamond = Math.floor(maxGameNumber/10) * 1
			GameRemote.app.rpc.db.remote.setValue(null,agencyId,"diamond",tmpDiamond,null)
			GameRemote.app.rpc.db.remote.setValue(null,agencyId,"useDiamond",-tmpDiamond,null)
			httpConf.coinChangeRecord(agencyId,6,tmpDiamond)

		}
	}
	if(GameRemote.roomList[roomId].isRecord == true){
		//记录战绩 
		var date = new Date()
		var record = {}
		record.roomId = roomId
		record.date = {
			"year" : date.getFullYear(),
			"month" : date.getMonth(),
			"day" : date.getDate(),
			"hours" : date.getHours(),
			"minute" : date.getMinutes(),
			"second" : date.getSeconds()
		}
		record.player = {}
		var nowIndex = 0
		for(var index in players){
			if(players.hasOwnProperty(index)){
				if(players[index].isActive){
					record.player[nowIndex++] = {
						"name" : players[index].playerInfo.nickname,
						"score" : players[index].score
					}
				}
			}
		}
		for(var index in players){
			if(players.hasOwnProperty(index)){
				if(players[index].isActive){
					GameRemote.app.rpc.db.remote.setHistory(null,players[index].uid,record,null)
				}
			}	
		}

		//记录日志
		var info = "   Room finish   roomId  : "+ roomId
		openRoomLogger.info(info)
		//记录牌局流水
		//记录流水日志
		var streamData = {
			"beginTime" : GameRemote.roomList[roomId].beginTime,
			"endTime" : GameRemote.roomList[roomId].endTime,
			"matchStream" : GameRemote.roomList[roomId].MatchStream,
			"scores" : GameRemote.roomList[roomId].scores,
			"gameMode" : GameRemote.roomList[roomId].gameMode,
			"roomId" : roomId,
			"bankerMode" : GameRemote.roomList[roomId].bankerMode,
			"gameNumber" : GameRemote.roomList[roomId].maxGameNumber,
			"cardMode" : GameRemote.roomList[roomId].cardMode,
			"consumeMode" : GameRemote.roomList[roomId].consumeMode,
			"basic" : GameRemote.roomList[roomId].basic,
			"room_uid" : GameRemote.roomList[roomId].agencyId || players[0].uid
		}
		info = "\r\n"
		info += "roomId  "+roomId+"   gameMode : "+streamData.gameMode+" :\r\n"
		info += "beginTime : "+streamData.beginTime + "     endTime : "+streamData.endTime+"\r\n"
		info += "matchStream : \r\n"
		for(var index in streamData.matchStream){
			if(streamData.matchStream.hasOwnProperty(index)){
				info += index + " : \r\n"+"players : \r\n"
				for(var i in streamData.matchStream[index]){
					if(streamData.matchStream[index].hasOwnProperty(i)){
						info += "    uid : " + streamData.matchStream[index][i].uid +"   changeScore : "+streamData.matchStream[index][i].changeScore
						+ " : "+JSON.stringify(streamData.matchStream[index][i].handCard)
						+ " : "+JSON.stringify(streamData.matchStream[index][i].result)+" \r\n"
					}
				}
			}
		}
		info += "scores : " + JSON.stringify(streamData.scores)
		info += "\r\n\r\n"
		streamLogger.info(info)
		//向后台发送当局数据
		httpConf.sendGameOver(streamData)
	}
	//通知gameServer
	GameRemote.app.rpc.game.remote.gameOver(null,roomId,players,flag,agencyId,maxGameNumber,function() {})
	//删除房间
	GameRemote.roomList[roomId] = false
	cb()
}

//解散房间
GameRemote.prototype.onFrame = freeFrame.onFrame
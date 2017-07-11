//var gameHandle = require('../handler/handle');
var MODE_DIAMOND_HOST = 1              //房主扣钻
var MODE_DIAMOND_EVERY = 2             //每人扣钻
var MODE_DIAMOND_WIN = 3               //大赢家扣钻
var ROOM_ALL_AMOUNT = 20000			   //总房间数量
var ROOM_BEGIN_INDEX = 200800   	   //起始房间ID
var NiuNiu = require("../games/NiuNiu.js")
var ZhaJinNiu = require("../games/ZhaJinNiu.js")
var MingPaiQZ = require("../games/MingPaiQZ.js")
var openRoomLogger = require("pomelo-logger").getLogger("openRoom-log");
var streamLogger = require("pomelo-logger").getLogger("matchStream-log");
var querystring = require('querystring')
var httpConf = require("../conf/httpModule.js")
var ROOM_FACTORY = {
	"niuniu" : NiuNiu,
	"zhajinniu" : ZhaJinNiu,
	"mingpaiqz" : MingPaiQZ
}
module.exports = function(app) {
  return new GameService(app);
};

var GameService = function(app) {
	this.app = app
	GameService.app = app
}
GameService.name = "GameService"
//房间回调 flag为true代表房间自动解散、否则为正常结束
var roomCallback = function(roomId,players,flag,cb) {
	//console.log("room end : "+ roomId)
	//console.log("diamond mode : "+GameService.roomList[roomId].consumeMode)
	//取消房间生存定时器
	clearTimeout(GameService.liveTimer[roomId])
	//将玩家从房间中解锁
	var roomPlayerCount = 0
	for(var index in players){
		if(players.hasOwnProperty(index)){
			if(players[index].isActive){		
                roomPlayerCount++
                delete GameService.userMap[players[index].uid]
			}
		}
	}	
	//扣除钻石
	var diamond = GameService.roomList[roomId].needDiamond
	var GAME_PLAYER = roomPlayerCount
	//console.log("diamond : "+diamond)
	//console.log("GAME_PLAYER : "+GAME_PLAYER)
	if(diamond !== 0){
		switch(GameService.roomList[roomId].consumeMode){
			case MODE_DIAMOND_HOST: 
				GameService.app.rpc.db.remote.setValue(null,players[0].uid,"diamond",-(diamond * 3),null)
				break;
			case MODE_DIAMOND_EVERY: 
				for(var index in players){
					if(players.hasOwnProperty(index)){
                        if(players[index].isActive){
                            GameService.app.rpc.db.remote.setValue(null,players[index].uid,"diamond",-diamond,null)
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
				GameService.app.rpc.db.remote.setValue(null,players[win].uid,"diamond",-(diamond * 3),null)
				break;		
		}		
	}
	if(GameService.roomList[roomId].isRecord == true){
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
					GameService.app.rpc.db.remote.setHistory(null,players[index].uid,record,null)
				}
			
			}	
		}

		//记录日志
		var info = "   Room finish   roomId  : "+ roomId
		openRoomLogger.info(info)
		//记录牌局流水
		//记录流水日志
		var streamData = {
			"beginTime" : GameService.roomList[roomId].beginTime,
			"endTime" : GameService.roomList[roomId].endTime,
			"matchStream" : GameService.roomList[roomId].MatchStream,
			"scores" : GameService.roomList[roomId].scores,
			"gameMode" : GameService.roomList[roomId].gameMode,
			"roomId" : roomId,
			"gameNumber" : GameService.roomList[roomId].maxGameNumber,
			"cardMode" : GameService.roomList[roomId].cardMode,
			"consumeMode" : GameService.roomList[roomId].consumeMode,
			"basic" : GameService.roomList[roomId].basic
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



	//更新代开房记录   state : 0 未结束   1 正在游戏中 2 已结束   3 已失效 
	var agencyId = GameService.roomList[roomId].agencyId
	if(agencyId){
		var agencyRoomInfo = {
			"roomId" : roomId,
			"state" : 2,
			"gameNumber" : GameService.roomList[roomId].maxGameNumber,
		}
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
		GameService.updateAgencyRoom(agencyId,agencyRoomInfo)

		//房间未开始游戏则返回钻石
		if(!GameService.roomList[roomId].isBegin()){
			var tmpDiamond = Math.ceil(GameService.roomList[roomId].maxGameNumber / 10) * 3
			GameService.app.rpc.db.remote.setValue(null,agencyId,"diamond",tmpDiamond,null)
		}
	}

	//删除房间
	GameService.roomState[roomId] = true
	GameService.roomList[roomId] = false

	cb()
}
//房间列表
GameService.roomList = {};
//房间状态
GameService.roomState = {};
//用户房间映射表
GameService.userMap = {}		
//房间锁定状态   用户请求解散房间会锁定房间
GameService.roomLock = {}
//玩家相应解散状态
GameService.lockState = {}
//解散请求计时器
GameService.lockTimer = {}
//房间生存计时器(时间到后自动解散房间)
GameService.liveTimer = {}
//代开房数据
GameService.agencyList = {}

GameService.prototype.start = function(cb) {
	//初始化房间
	GameService.channelService = this.app.get('channelService');

	for(var i = ROOM_BEGIN_INDEX;i < ROOM_ALL_AMOUNT + ROOM_BEGIN_INDEX;i++){
		GameService.roomState[i] = true
		GameService.roomList[i] = false
		GameService.roomLock[i] = true
		GameService.lockState[i] = {}
	}

	this.app.set("GameService",GameService)
	cb()
}

//分配房间号
GameService.getUnusedRoom = function(roomType) {
	if(!ROOM_FACTORY[roomType]){
		return false
	}
	//随机分配房间号
	var roomId = Math.floor((Math.random() * ROOM_ALL_AMOUNT))
	for(var i = roomId;i < ROOM_ALL_AMOUNT + roomId;i++){
		var index = (roomId % ROOM_ALL_AMOUNT) + ROOM_BEGIN_INDEX
		if(GameService.roomState[index] == true){
			GameService.roomList[index] = ROOM_FACTORY[roomType].createRoom(index,GameService.channelService,roomCallback)
			GameService.liveTimer[index] = setTimeout(finishGameOfTimer(index),8 * 60 * 60 * 1000)
			return index
		}
	}
	return false
}

var finishGameOfTimer = function(index) {
	return function() {
		if(GameService.roomList[index].isFree()){
			//房间空闲则解散
			//记录日志
			var info = "finishGameOfTimer   Room finish   roomId  : "+ index
			openRoomLogger.info(info)
			GameService.roomList[index].finishGame(true)
		}else{
			//正在游戏中则过一段时间后再次发起再次解散
			GameService.liveTimer[index] = setTimeout(finishGameOfTimer(index),1 * 60 * 60 * 1000)
		}
	}
}


GameService.setAgencyRoom = function(uid,agencyRoom) {
	var  agencyInfo = GameService.agencyList[uid]
	if(!agencyInfo){
		agencyInfo = {}
		agencyInfo.List = {}
	}
	for(var i = 9;i > 0;i--){
		if(agencyInfo.List[i - 1]){
			agencyInfo.List[i] = agencyInfo.List[i - 1]
		}
	}	
	agencyInfo.List[0] = agencyRoom
	GameService.agencyList[uid] = agencyInfo
}

GameService.updateAgencyRoom = function(agencyId,agencyRoom) {
	var agencyInfo = GameService.agencyList[agencyId]
		for(var i = 9;i >= 0;i--){
			if(agencyInfo.List[i]){
				//找到并修改代开房记录
				if(agencyInfo.List[i].roomId === agencyRoom.roomId){
					agencyInfo.List[i] = agencyRoom
					GameService.agencyList[agencyId] = agencyInfo
					return
				}
			}
		}
}

GameService.getAgencyRoom = function(agencyId) {
	var agencyInfo = GameService.agencyList[agencyId]
	return agencyInfo
}
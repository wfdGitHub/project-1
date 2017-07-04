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
var ROOM_FACTORY = {
	"niuniu" : NiuNiu,
	"zhajinniu" : ZhaJinNiu,
	"mingpaiqz" : MingPaiQZ
}
module.exports = function(app) {
  return new NiuNiuService(app);
};

var NiuNiuService = function(app) {
	this.app = app
	NiuNiuService.app = app
}
NiuNiuService.name = "NiuNiuService"
//房间回调 flag为true代表房间自动解散、否则为正常结束
var roomCallback = function(roomId,players,flag,cb) {
	//console.log("room end : "+ roomId)
	//console.log("diamond mode : "+NiuNiuService.roomList[roomId].consumeMode)
	//取消房间生存定时器
	clearTimeout(NiuNiuService.liveTimer[roomId])
	//将玩家从房间中解锁
	var roomPlayerCount = 0
	for(var index in players){
		if(players.hasOwnProperty(index)){
			if(players[index].isActive){		
                roomPlayerCount++
                delete NiuNiuService.userMap[players[index].uid]
			}
		}
	}	
	//扣除钻石
	var diamond = NiuNiuService.roomList[roomId].needDiamond
	var GAME_PLAYER = roomPlayerCount
	//console.log("diamond : "+diamond)
	//console.log("GAME_PLAYER : "+GAME_PLAYER)
	if(diamond !== 0){
		switch(NiuNiuService.roomList[roomId].consumeMode){
			case MODE_DIAMOND_HOST: 
				NiuNiuService.app.rpc.db.remote.setValue(null,players[0].uid,"diamond",-(diamond * 3),null)
				break;
			case MODE_DIAMOND_EVERY: 
				for(var index in players){
					if(players.hasOwnProperty(index)){
                        if(players[index].isActive){
                            NiuNiuService.app.rpc.db.remote.setValue(null,players[index].uid,"diamond",-diamond,null)
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
				NiuNiuService.app.rpc.db.remote.setValue(null,players[win].uid,"diamond",-(diamond * 3),null)
				break;		
		}		
	}
	if(NiuNiuService.roomList[roomId].isRecord == true){
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
					NiuNiuService.app.rpc.db.remote.setHistory(null,players[index].uid,record,null)
				}
			
			}	
		}
	}
	//记录日志
	var info = "   Room finish   roomId  : "+ roomId
	openRoomLogger.info(info)
	//记录牌局流水
	//记录流水日志
	var streamData = {
		"beginTime" : NiuNiuService.roomList[roomId].beginTime,
		"endTime" : NiuNiuService.roomList[roomId].endTime,
		"matchStream" : NiuNiuService.roomList[roomId].MatchStream,
		"scores" : NiuNiuService.roomList[roomId].scores
	}
	info = "\r\n"
	info += "roomId  "+roomId+" :\r\n"
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
	//更新代开房记录   state : 0 未结束   1 正在游戏中 2 已结束   3 已失效 
	var agencyId = NiuNiuService.roomList[roomId].agencyId
	if(agencyId){
		var agencyRoomInfo = {
			"roomId" : roomId,
			"state" : 2,
			"gameNumber" : NiuNiuService.roomList[roomId].maxGameNumber,
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
		NiuNiuService.updateAgencyRoom(agencyId,agencyRoomInfo)

		//房间未开始游戏则返回钻石
		if(!NiuNiuService.roomList[roomId].isBegin()){
			var tmpDiamond = Math.ceil(NiuNiuService.roomList[roomId].maxGameNumber / 10) * 3
			NiuNiuService.app.rpc.db.remote.setValue(null,agencyId,"diamond",tmpDiamond,null)
		}
	}

	//删除房间
	NiuNiuService.roomState[roomId] = true
	NiuNiuService.roomList[roomId] = false

	cb()
}
//房间列表
NiuNiuService.roomList = {};
//房间状态
NiuNiuService.roomState = {};
//用户房间映射表
NiuNiuService.userMap = {}		
//房间锁定状态   用户请求解散房间会锁定房间
NiuNiuService.roomLock = {}
//玩家相应解散状态
NiuNiuService.lockState = {}
//解散请求计时器
NiuNiuService.lockTimer = {}
//房间生存计时器(时间到后自动解散房间)
NiuNiuService.liveTimer = {}
//代开房数据
NiuNiuService.agencyList = {}

NiuNiuService.prototype.start = function(cb) {
	//初始化房间
	NiuNiuService.channelService = this.app.get('channelService');

	for(var i = ROOM_BEGIN_INDEX;i < ROOM_ALL_AMOUNT + ROOM_BEGIN_INDEX;i++){
		NiuNiuService.roomState[i] = true
		NiuNiuService.roomList[i] = false
		NiuNiuService.roomLock[i] = true
		NiuNiuService.lockState[i] = {}
	}

	this.app.set("NiuNiuService",NiuNiuService)
	cb()
}

//分配房间号
NiuNiuService.getUnusedRoom = function(roomType) {
	if(!ROOM_FACTORY[roomType]){
		return false
	}
	//随机分配房间号
	var roomId = Math.floor((Math.random() * ROOM_ALL_AMOUNT))
	for(var i = roomId;i < ROOM_ALL_AMOUNT + roomId;i++){
		var index = (roomId % ROOM_ALL_AMOUNT) + ROOM_BEGIN_INDEX
		if(NiuNiuService.roomState[index] == true){
			NiuNiuService.roomList[index] = ROOM_FACTORY[roomType].createRoom(index,NiuNiuService.channelService,roomCallback)
			NiuNiuService.liveTimer[index] = setTimeout(finishGameOfTimer(index),8 * 60 * 60 * 1000)
			return index
		}
	}
	return false
}

var finishGameOfTimer = function(index) {
	return function() {
		if(NiuNiuService.roomList[index].isFree()){
			//房间空闲则解散
			//记录日志
			var info = "finishGameOfTimer   Room finish   roomId  : "+ index
			openRoomLogger.info(info)
			NiuNiuService.roomList[index].finishGame(true)
		}else{
			//正在游戏中则过一段时间后再次发起再次解散
			NiuNiuService.liveTimer[index] = setTimeout(finishGameOfTimer(index),1 * 60 * 60 * 1000)
		}
	}
}


NiuNiuService.setAgencyRoom = function(uid,agencyRoom) {
	var  agencyInfo = NiuNiuService.agencyList[uid]
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
	NiuNiuService.agencyList[uid] = agencyInfo
}

NiuNiuService.updateAgencyRoom = function(agencyId,agencyRoom) {
	var agencyInfo = NiuNiuService.agencyList[agencyId]
		for(var i = 9;i >= 0;i--){
			if(agencyInfo.List[i]){
				//找到并修改代开房记录
				if(agencyInfo.List[i].roomId === agencyRoom.roomId){
					agencyInfo.List[i] = agencyRoom
					NiuNiuService.agencyList[agencyId] = agencyInfo
					return
				}
			}
		}
}

NiuNiuService.getAgencyRoom = function(agencyId) {
	var agencyInfo = NiuNiuService.agencyList[agencyId]
	return agencyInfo
}
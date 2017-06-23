//var gameHandle = require('../handler/handle');
var MODE_DIAMOND_HOST = 1              //房主扣钻
var MODE_DIAMOND_EVERY = 2             //每人扣钻
var MODE_DIAMOND_WIN = 3               //大赢家扣钻
var ROOM_ALL_AMOUNT = 2000			   //总房间数量
var ROOM_BEGIN_INDEX = 200800   	   //起始房间ID
var NiuNiu = require("../games/NiuNiu.js")
var ZhaJinNiu = require("../games/ZhaJinNiu.js")
var openRoomLogger = require("pomelo-logger").getLogger("openRoom-log");
var ROOM_FACTORY = {
	"niuniu" : NiuNiu,
	"zhajinniu" : ZhaJinNiu
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
				NiuNiuService.app.rpc.db.remote.setValue(null,players[0].uid,"diamond",-(diamond * GAME_PLAYER),null)
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
				NiuNiuService.app.rpc.db.remote.setValue(null,players[win].uid,"diamond",-(diamond * GAME_PLAYER),null)
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
	//更新代开房记录   state : 0 未结束   1 正在游戏中 2 已结束   3 已失效 
	if(NiuNiuService.roomList[roomId].agencyId){
		var agencyRoomInfo = {
			"roomId" : roomId,
			"state" : 2
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
		NiuNiuService.app.rpc.db.remote.updateAgencyRoom(null,NiuNiuService.roomList[roomId].agencyId,agencyRoomInfo,function() {})
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
			NiuNiuService.liveTimer[index] = setTimeout(finishGameOfTimer(index),4 * 60 * 60 * 1000)
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
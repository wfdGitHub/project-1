//var gameHandle = require('../handler/handle');
var ROOM_ALL_AMOUNT = 20000			   //总房间数量
var ROOM_BEGIN_INDEX = 200800   	   //起始房间ID

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
}
//房间所在游戏服务映射
GameService.roomList = {};
//房间状态
GameService.roomState = {};
//用户房间映射表
GameService.userMap = {}		
//房间与用户映射表
GameService.RoomMap = {}	
//代开房数据
GameService.agencyList = {}

GameService.prototype.start = function(cb) {
	//初始化房间
	for(var i = ROOM_BEGIN_INDEX;i < ROOM_ALL_AMOUNT + ROOM_BEGIN_INDEX;i++){
		GameService.roomState[i] = true
		GameService.roomList[i] = false
	}

	this.app.set("GameService",GameService)
	cb()
}

//分配房间号
GameService.getUnusedRoom = function(roomType) {
	//随机分配房间号
	var roomId = typeof((new Date()).getTime() + "" + Math.floor(Math.random() * 100000))
	return roomId
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

//从房间ID获取代开房信息
GameService.getAgencyRoomByID = function(agencyId,roomId) {
	var agencyInfo = GameService.getAgencyRoom(agencyId)
	for(var i = 9;i >= 0;i--){
		if(agencyInfo.List[i]){
			if(agencyInfo.List[i].roomId === roomId){
				return agencyInfo.List[i]
			}
		}
	}
	return false	
}

//通过房间ID设置代开房信息
GameService.setAgencyRoomByID = function(agencyId,roomId,agencyRoom) {
	// console.log(GameService.agencyList[agencyId])
	// console.log("setAgencyRoomByID  roomId : "+roomId)
	var agencyInfo = GameService.agencyList[agencyId]
	for(var i = 9;i >= 0;i--){
		if(agencyInfo.List[i]){
			if(agencyInfo.List[i].roomId === roomId){
				agencyInfo.List[i] = agencyRoom
				GameService.agencyList[agencyId] = agencyInfo
				// console.log("setAgencyRoomByID====")
				// console.log(GameService.agencyList[agencyId])
				return
			}
		}
	}
}
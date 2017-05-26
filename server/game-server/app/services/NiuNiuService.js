//var gameHandle = require('../handler/handle');
var MODE_DIAMOND_HOST = 1              //房主扣钻
var MODE_DIAMOND_EVERY = 2             //每人扣钻
var MODE_DIAMOND_WIN = 3               //大赢家扣钻
var ROOM_AMOUNT      = 10			   //房间数量
var NiuNiu = require("../games/NiuNiu.js")
module.exports = function(app) {
  return new NiuNiuService(app);
};

var NiuNiuService = function(app) {
	this.app = app
	NiuNiuService.app = app
}
NiuNiuService.name = "NiuNiuService"
//房间回调
var roomCallback = function(roomId,players,cb) {
	console.log("room end "+ roomId)
	console.log("diamond mode : "+NiuNiuService.roomList[roomId].consumeMode)
	NiuNiuService.roomState[roomId] = true
	//将玩家从房间中解锁
	for(var index in players){
		if(players.hasOwnProperty(index)){
			delete NiuNiuService.userMap[players[index].uid]
		}
	}	
	//扣除钻石
	var diamond = NiuNiuService.roomList[roomId].needDiamond
	var GAME_PLAYER = NiuNiuService.roomList[roomId].GAME_PLAYER
	console.log("diamond : "+diamond)
	switch(NiuNiuService.roomList[roomId].consumeMode){
		case MODE_DIAMOND_HOST: 
			NiuNiuService.app.rpc.db.remote.setValue(null,players[0].uid,"diamond",-(diamond * GAME_PLAYER),null)
			break;
		case MODE_DIAMOND_EVERY: 
			for(var index in players){
				if(players.hasOwnProperty(index)){
					NiuNiuService.app.rpc.db.remote.setValue(null,players[index].uid,"diamond",-diamond,null)
				}
			}			
			break;
		case MODE_DIAMOND_WIN: 
			var win = 0
			var winScore = 0
			for(var index in players){
				if(players.hasOwnProperty(index)){
					if(players[index].score > winScore){
						win = index
						winScore = players[index].score
					}
				}
			}		
			NiuNiuService.app.rpc.db.remote.setValue(null,players[win].uid,"diamond",-(diamond * GAME_PLAYER),null)
			break;		
	}
	//记录战绩
	for(var index in players){
		if(players.hasOwnProperty(index)){
			var record = players[index].score
			//console.log(NiuNiuService.app.rpc.db.remote)
			NiuNiuService.app.rpc.db.remote.setHistory(null,players[index].uid,record,null)			
		}	
	}	
	cb()
}
//房间列表
NiuNiuService.roomList = new Array(ROOM_AMOUNT);
//房间状态
NiuNiuService.roomState = new Array(ROOM_AMOUNT);
//用户房间映射表
NiuNiuService.userMap = {}		

NiuNiuService.prototype.start = function(cb) {
	//初始化房间
	NiuNiuService.channelService = this.app.get('channelService');

	for(var i = 0;i < ROOM_AMOUNT;i++){
		NiuNiuService.roomList[i] = NiuNiu.createRoom(i,NiuNiuService.channelService,roomCallback)
		NiuNiuService.roomState[i] = true
	}
	this.app.set("NiuNiuService",NiuNiuService)
	cb()
}

//找到闲置房间
NiuNiuService.getUnusedRoom = function() {
	for(var i = 0;i < ROOM_AMOUNT;i++){
		if(NiuNiuService.roomState[i] == true){
			return i
		}
	}
	return false
}
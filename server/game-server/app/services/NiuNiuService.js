//var gameHandle = require('../handler/handle');
var NiuNiu = require("../games/NiuNiu.js")
module.exports = function(app) {
  return new NiuNiuService(app);
};

var NiuNiuService = function(app) {
	this.app = app
}
NiuNiuService.name = "NiuNiuService"
//房间回调
var roomCallback = function(roomId) {
	console.log("room end "+ roomId)
}
//房间列表
NiuNiuService.roomList = new Array(10);
//房间状态
NiuNiuService.roomState = new Array(10);
//用户房间映射表
NiuNiuService.userMap = {}		

NiuNiuService.prototype.start = function(cb) {
	//初始化房间
	NiuNiuService.channelService = this.app.get('channelService');
	for(var i = 1;i < 2;i++){
		NiuNiuService.roomList[i] = NiuNiu.createRoom(i,NiuNiuService.channelService,roomCallback)
	}
	this.app.set("NiuNiuService",NiuNiuService)
	cb()
}
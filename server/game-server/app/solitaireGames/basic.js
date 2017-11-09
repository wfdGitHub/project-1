//游戏逻辑算法
var logic
//配置文件
var conf = require("../conf/niuniuConf.js").niuConf
//创建单人房间
module.exports.createRoom = function(roomId,GameRemote.channelService,local.beginCB,local.settlementCB,local.gemeOver) {
	//初始化房间信息
	var room = {}
	room.roomId = roomId
	room.gameMode = conf.MODE_GAME_FLOP  
	room.state = conf.GS_FREE



	//房间方法
	var local = {}




}
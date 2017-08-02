var conf = require("../../../conf/niuniuConf.js").niuConf
var tips = require("../../../conf/tips.js").tipsConf
var async = require("async")

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
//新建房间
GameRemote.prototype.newRoom = function(params,players,sids,roomId,cb) {
	console.log("newRoom : ")
	console.log(players)
	for(var i = 0;i < players.length;i++){
		GameRemote.userMap[players[i]] = roomId
		GameRemote.roomList[roomId] = true
	}
	cb(true,players,roomId)
}

//加入房间
GameRemote.prototype.joinRoom = function(params,player,roomId,cb) {
	var roomId = GameRemote.userMap(player.uid)
	if(roomId){
		cb(false)
		return
	}
	GameRemote.userMap[player.uid] = roomId
	console.log("joinRoom : ")
	console.log(player)
	cb(true)
}

//离开房间
GameRemote.prototype.quitRoom = function(params,uid,cb) {
	console.log("goldNode quitRoom")
	var roomId = GameRemote.userMap[uid]
	if(!roomId){
		cb(false)
		return
	}
	console.log("quitRoom : ")
	console.log(uid)
	local.quitRoom(uid)
	cb(true)
}

//玩家退出房间回调
local.quitRoom = function(uid) {
	delete GameRemote.userMap[uid]
}
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
	
	cb(true,players)
}

//加入房间
GameRemote.prototype.joinRoom = function(params,player,roomId,cb) {
	var roomId = GameRemote.userMap(uid)
	if(roomId){
		cb(false)
		return
	}
	GameRemote.userMap[uid] = roomId
	cb(true)
}

//离开房间
GameRemote.prototype.quitRoom = function(params,uid,cb) {
	var roomId = GameRemote.userMap[uid]
	if(!roomId){
		cb(false)
		return
	}

	local.quitRoom(uid)
	cb(true)
}



//玩家退出房间回调
local.quitRoom = function(uid) {
	
}
var conf = require("../../../conf/niuniuConf.js").niuConf
var tips = require("../../../conf/tips.js").tipsConf
var async = require("async")

module.exports = function(app) {
	return new GameRemote(app);
};

var local = {}
var GameRemote = function(app) {
	this.app = app
	GameRemote.app = app
};

GameRemote.roomList = {};

//新建房间
GameRemote.newRoom = function(argument) {
	
}

//加入房间
GameRemote.join = function(argument) {
	
}


//结束房间
GameRemote.finishRoom = function(argument) {
	
}
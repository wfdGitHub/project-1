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

GameRemote.newRoom = function(argument) {
	
}
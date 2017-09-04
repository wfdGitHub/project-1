var conf = require("../../../conf/niuniuConf.js").niuConf
var tips = require("../../../conf/tips.js").tipsConf
var giveCfg = require("../../../conf/give.js")
var goldMingpai = require("../../../goldGames/goldMingpai.js")
var goldNiuNiu = require("../../../goldGames/niuniu.js")
var goldLogger = require("pomelo-logger").getLogger("goldRoom-log")
var async = require("async")

var ROOM_FACTORY = {
	"goldMingpai-1-gold" : goldMingpai,
	"goldMingpai-2-gold" : goldMingpai,
	"goldMingpai-3-gold" : goldMingpai,
	"goldNiuNiu-1-gold" : goldNiuNiu,
	"goldNiuNiu-2-gold" : goldNiuNiu,
	"goldNiuNiu-3-gold" : goldNiuNiu,
	"goldMingpai-1-diamond" : goldMingpai,
	"goldMingpai-2-diamond" : goldMingpai,
	"goldMingpai-3-diamond" : goldMingpai,
	"goldNiuNiu-1-diamond" : goldNiuNiu,
	"goldNiuNiu-2-diamond" : goldNiuNiu,
	"goldNiuNiu-3-diamond" : goldNiuNiu	
}
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
GameRemote.liveTimer = {}
//新建房间
GameRemote.prototype.newRoom = function(params,uids,sids,infos,roomId,cb) {
	if(!ROOM_FACTORY[params.gameType]){
		cb(false)
		return
	}
	var currencyType = params.gameType.split("-")[2]
	console.log("currencyType : "+currencyType)
	GameRemote.roomList[roomId] = ROOM_FACTORY[params.gameType].createRoom(currencyType,params.gameType,roomId,GameRemote.channelService,local.settlementCB,local.quitRoom,local.gemeOver,local.beginCB)
    GameRemote.roomList[roomId].newRoom(uids,sids,infos,function (flag) {
		if(flag){
			var info = "   newRoom   gold roomId  : "+ roomId
			goldLogger.info(info)
			//console.log(uids)
			for(var i = 0;i < uids.length;i++){
				GameRemote.userMap[uids[i]] = roomId
			}
			//房间计时器
			clearTimeout(GameRemote.liveTimer[roomId])
			GameRemote.liveTimer[roomId] = setTimeout(finishGameOfTimer(roomId),8 * 60 * 60 * 1000)
			cb(true,uids,roomId)
		}else{
			delete GameRemote.roomList[roomId]
			cb(false)
		}
    })
}

//加入房间
GameRemote.prototype.joinRoom = function(params,player,roomId,cb) {
	//console.log(player)
	if(!GameRemote.roomList[roomId]){
		goldLogger.info("joinError!!!!!!!")
		cb(false)
		return
	}
	GameRemote.roomList[roomId].handle.join(player.uid,player.sid,player.info,function(flag){
		if(flag){
			GameRemote.userMap[player.uid] = roomId
			//console.log("joinRoom : ")
			//console.log(player)
		}
		cb(flag)
	})
}

//离开房间
GameRemote.prototype.quitRoom = function(params,uid,cb) {
	console.log("goldNode quitRoom")
	var roomId = GameRemote.userMap[uid]
	if(!roomId){
		cb(false)
		return
	}
	local.quitRoom(uid,roomId,cb)
}

//玩家退出房间回调
local.quitRoom = function(uid,roomId,cb) {
	uid = parseInt(uid)
	GameRemote.roomList[roomId].userQuit(uid,function(flag,uid) {
		if(flag){
			delete GameRemote.userMap[uid]
			GameRemote.app.rpc.goldGame.remote.userOutRoom(null,roomId,uid,function(){})
		}
		if(cb){
			cb(flag)
		}
	})
}

//玩家重连
GameRemote.prototype.reconnection = function(params,uid,sid,roomId,cb) {
	GameRemote.roomList[roomId].reconnection(uid,sid,function(data) {
		cb(data)
	})
}
//玩家离开
GameRemote.prototype.disconnect = function(params,uid,sid,roomId,cb) {
	GameRemote.roomList[roomId].leave(uid)
	cb(true)
}
//房间指令
GameRemote.prototype.receive = function(params,uid,sid,roomId,code,cb) {
	//赠送礼物处理
	switch(code){
		case "give":
		//console.log(params)
			local.give(uid,params.targetChair,roomId,params.giveId,cb)
		return
		default :
			if(GameRemote.roomList[roomId].handle[code]){
				GameRemote.roomList[roomId].handle[code](uid,sid,params,cb)
			}else{
				cb(false)
			}
		return
	}
}
//赠送道具
local.give = function(uid,targetChair,roomId,giveId,cb) {
	//console.log(targetChair)
	var room = GameRemote.roomList[roomId]
	var chair = room.chairMap[uid]
	var player = room.getPlayer()
	if(chair === undefined || targetChair > 5 || targetChair < 0 || !player[targetChair].isActive || chair === targetChair){
		cb(false)
		return
	}
	var targetUid = player[targetChair].uid
	if(!giveCfg[giveId]){
		cb(false)
		return
	}
	//扣除赠送者钻石
	GameRemote.app.rpc.db.remote.getValue(null,uid,"diamond",function(data) {
		//console.log("diamond ： "+data)
		var needDiamond = giveCfg[giveId].needDiamond
		if(data && data >= needDiamond){
			GameRemote.app.rpc.db.remote.setValue(null,uid,"diamond",-needDiamond,function() {
				//增加目标金币及魅力值
				var gold = giveCfg[giveId].gold
				var charm = giveCfg[giveId].charm
				if(!player[targetChair].isRobot){
					GameRemote.app.rpc.db.remote.setValue(null,targetUid,"gold",gold,function(){
						GameRemote.app.rpc.db.remote.setValue(null,targetUid,"charm",charm,function(){})
					})
				}
				player[targetChair].score += gold
				player[targetChair].charm += charm
				//今日魅力值更新
				player[targetChair].playerInfo.refreshList.charmValue += charm
				var notify = {
					"cmd" : "give",
					"chair" : chair,
					"targetChair" : targetChair,
					"giveId" : giveId,
					"gold" : gold,
					"dayCharm" : player[targetChair].playerInfo.refreshList.charmValue
				}
				room.sendAll(notify)
			})
			cb(true)
		}else{
			cb(false)
		}
	})
}
//房间超时回调
var finishGameOfTimer = function(index) {
	return function() {
		if(GameRemote.roomList[index].isFree()){
			//房间空闲则解散
			//记录日志
			var info = "finishGameOfTimer   gold Room finish   roomId  : "+ index
			goldLogger.info(info)
			GameRemote.roomList[index].finishGame(true)
		}else{
			//正在游戏中则过一段时间后再次发起再次解散
			GameRemote.liveTimer[index] = setTimeout(finishGameOfTimer(index),1 * 60 * 60 * 1000)
		}
	}
}
//游戏开始回调
local.beginCB = function(roomId,player,rate,currencyType) {
	if(currencyType !== "diamond"){
		currencyType = "gold"
	}
	for(var index in player){
		if(player.hasOwnProperty(index)){
			if(player[index].isActive && !player[index].isRobot){
				player[index].score -= rate * 50
				GameRemote.app.rpc.db.remote.setValue(null,player[index].uid,currencyType,rate * 50,function(){})				
			}
		}
	}
}


//小结算回调
local.settlementCB = function(roomId,curScores,player,rate,currencyType) {
	//TODO
	//console.log("roomId : "+roomId)
	//console.log(curScores)
	//console.log(player)
	//更改金币
	if(currencyType !== "diamond"){
		currencyType = "gold"
	}
	for(var index in curScores){
		if(curScores.hasOwnProperty(index)){
			if(curScores){
				if(player[index].isActive && !player[index].isRobot){
					GameRemote.app.rpc.db.remote.setValue(null,player[index].uid,currencyType,curScores[index],function(){})				
				}
			}
		}
	}
	//console.log(player)
	//console.log("rate : "+rate)
	//货币等于0退出游戏
	for(var index in player){
		if(player.hasOwnProperty(index)){
			if(player[index].isActive){
				if(player[index].score < rate * 50){
					//退出游戏
					local.quitRoom(player[index].uid,roomId,function(){})
				}
			}
		}
	}
}

//房间结束回调
local.gemeOver = function(roomId,players,type) {
	clearTimeout(GameRemote.liveTimer[roomId])
	for(var i = 0;i < players.length;i++){
		if(players[i].isActive){
			delete GameRemote.userMap[players[i].uid]
		}
	}
	GameRemote.app.rpc.goldGame.remote.gameOver(null,roomId,players,type,function(){})
	GameRemote.roomList[roomId].gameOver()
	GameRemote.roomList[roomId] = false
}
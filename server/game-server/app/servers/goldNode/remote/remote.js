var conf = require("../../../conf/niuniuConf.js").niuConf
var tips = require("../../../conf/tips.js").tipsConf
var giveCfg = require("../../../conf/give.js")
var goldMingpai = require("../../../goldGames/goldMingpai.js")
var goldNiuNiu = require("../../../goldGames/niuniu.js")
var goldLogger = require("pomelo-logger").getLogger("goldRoom-log")
var lottoConf = require("../../../conf/lotto.js")
var httpConf = require("../../../conf/httpModule.js")
var async = require("async")

var ROOM_FACTORY = {
	"goldMingpai-1-gold" : goldMingpai,
	"goldMingpai-2-gold" : goldMingpai,
	"goldMingpai-3-gold" : goldMingpai,
	"goldMingpai-4-gold" : goldMingpai,
	"goldMingpai-5-gold" : goldMingpai,
	"goldNiuNiu-1-gold" : goldNiuNiu,
	"goldNiuNiu-2-gold" : goldNiuNiu,
	"goldNiuNiu-3-gold" : goldNiuNiu,
	"goldNiuNiu-4-gold" : goldNiuNiu,
	"goldNiuNiu-5-gold" : goldNiuNiu
}
var ROOM_TYPE = {
	"niuniu" : goldNiuNiu,
	"mingpaiqz" : goldMingpai
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
//自动匹配房间
GameRemote.prototype.newRoom = function(params,uids,sids,infos,roomId,cb) {
	if(!ROOM_FACTORY[params.gameType]){
		cb(false)
		return
	}
	var currencyType = params.gameType.split("-")[2]
	GameRemote.roomList[roomId] = ROOM_FACTORY[params.gameType].createRoom(currencyType,params.gameType,params.rate,roomId,GameRemote.channelService,local.settlementCB,local.quitRoom,local.gemeOver,local.beginCB)
    GameRemote.roomList[roomId].newRoom(uids,sids,infos,false,function (flag) {
		if(flag){
			var info = "   newRoom   gold roomId  : "+ roomId
			goldLogger.info(info)
			//console.log(uids)
			for(var i = 0;i < uids.length;i++){
				GameRemote.userMap[uids[i]] = roomId
			}
			//房间计时器
			clearTimeout(GameRemote.liveTimer[roomId])
			GameRemote.liveTimer[roomId] = setTimeout(finishGameOfTimer(roomId),5 * 60 * 1000)
			cb(true,uids,roomId)
		}else{
			delete GameRemote.roomList[roomId]
			cb(false)
		}
    })
}

//主动创建房间
GameRemote.prototype.createRoom = function(params,uids,sids,infos,rate,roomId,cb) {
	// console.log("params.gameType : "+params.gameType)
	// console.log(ROOM_TYPE)
	if(!ROOM_TYPE[params.gameType]){
		cb(false)
		return
	}
	var currencyType = "gold"
	GameRemote.roomList[roomId] = ROOM_TYPE[params.gameType].createRoom(currencyType,params.gameType,rate,roomId,GameRemote.channelService,local.settlementCB,local.quitRoom,local.gemeOver,local.beginCB)
    GameRemote.roomList[roomId].newRoom(uids,sids,infos,params,function (flag) {
		if(flag){
			var info = "   createRoom   gold roomId  : "+ roomId + "  uid : "+JSON.stringify(uids) + "    "+JSON.stringify(infos) + "   rate : "+rate
			goldLogger.info(info)
			//console.log(uids)
			for(var i = 0;i < uids.length;i++){
				GameRemote.userMap[uids[i]] = roomId
			}
			//房间计时器
			clearTimeout(GameRemote.liveTimer[roomId])
			GameRemote.liveTimer[roomId] = setTimeout(finishGameOfTimer(roomId),15 * 60 * 1000)
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
			console.log("joinRoom : ")
			console.log(player)
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
	cb(true)
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
	if(GameRemote.roomList[roomId]){
		GameRemote.roomList[roomId].reconnection(parseInt(uid),sid,function(data) {
			cb(data)
		})
	}else{
		cb(false)
	}
}
//玩家离开
GameRemote.prototype.disconnect = function(params,uid,sid,roomId,cb) {
	GameRemote.roomList[roomId].leave(uid)
	cb(true)
}
//房间指令
GameRemote.prototype.receive = function(params,uid,sid,roomId,code,cb) {
	switch(code){
		case "give":
		//赠送礼物处理
		//console.log(params)
			// local.give(uid,params.targetChair,roomId,params.giveId,cb)
			cb(false)
		return
		case "lotto":
			cb(false)
			//local.lotto(uid,roomId,cb)
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
//抽奖
local.lotto = function(uid,roomId,cb) {
	var room = GameRemote.roomList[roomId]
	var chair = room.chairMap[uid]
	var player = room.getPlayer()
	if(chair === undefined){
		cb(false)
		return
	}
	if(player[chair].gameCount >= 5){
		player[chair].gameCount = 0
  		//领取奖品
  		var weight = 0
  		for(var i = 0; i < lottoConf.length; i++){
  			weight += lottoConf[i].weight
  		}
  		// console.log("weight : "+weight)
  		var rand = Math.floor(Math.random() * weight)
  		var curWeight = 0
  		for(var i = 0; i < lottoConf.length; i++){
  			curWeight += lottoConf[i].weight
  			if(rand < curWeight){
  				//领取奖励
  				if(lottoConf[i].type){
  					GameRemote.app.rpc.db.remote.setValue(null,uid,lottoConf[i].type,lottoConf[i].value,"抽奖",function(){})
  					if(room.currencyType == lottoConf[i].type){
  						player[chair].score += lottoConf[i].value
  					}
  				}
  				var notify = {
  					"cmd" : "lottoAward",
  					"type" : lottoConf[i].type,
  					"value" : lottoConf[i].value,
  					"chair" : chair,
  					"score" : player[chair].score
  				}
  				room.sendAll(notify)
  				cb({flag : true,"data" : lottoConf[i],"index" : i})
  				return
  			}
  		}
	}else{
		cb(false)
	}
}
//赠送道具
// local.give = function(uid,targetChair,roomId,giveId,cb) {
// 	//console.log(targetChair)
// 	var room = GameRemote.roomList[roomId]
// 	var chair = room.chairMap[uid]
// 	var player = room.getPlayer()
// 	if(chair === undefined || targetChair > 5 || targetChair < 0 || !player[targetChair].isActive || chair === targetChair){
// 		cb(false)
// 		return
// 	}
// 	var targetUid = player[targetChair].uid
// 	if(!giveCfg[giveId]){
// 		cb(false)
// 		return
// 	}
// 	//扣除赠送者钻石
// 	GameRemote.app.rpc.db.remote.getValue(null,uid,"diamond",function(data) {
// 		//console.log("diamond ： "+data)
// 		var needDiamond = giveCfg[giveId].needDiamond
// 		if(data && data >= needDiamond){
// 			GameRemote.app.rpc.db.remote.setValue(null,uid,"diamond",-needDiamond,function() {
// 				//增加目标金币及魅力值
// 				var gold = giveCfg[giveId].gold
// 				var charm = giveCfg[giveId].charm
// 				if(!player[targetChair].isRobot){
// 					GameRemote.app.rpc.db.remote.setValue(null,targetUid,"gold",gold,function(){
// 						GameRemote.app.rpc.db.remote.setValue(null,targetUid,"charm",charm,function(){})
// 					})
// 				}
// 				player[targetChair].score += gold
// 				player[targetChair].charm += charm
// 				//今日魅力值更新
// 				player[targetChair].playerInfo.refreshList.charmValue += charm
// 				var notify = {
// 					"cmd" : "give",
// 					"chair" : chair,
// 					"targetChair" : targetChair,
// 					"giveId" : giveId,
// 					"gold" : gold,
// 					"dayCharm" : player[targetChair].playerInfo.refreshList.charmValue
// 				}
// 				room.sendAll(notify)
// 			})
// 			cb(true)
// 		}else{
// 			cb(false)
// 		}
// 	})
// }
//房间超时回调
var finishGameOfTimer = function(index) {
	return function() {
		//房间内无玩家则解散
		if(!GameRemote.roomList[index].isHaveHumen()){
			//房间空闲则解散
			//记录日志
			var info = "finishGameOfTimer   gold Room finish   roomId  : "+ index
			goldLogger.info(info)
			GameRemote.roomList[index].finishGame(true)
		}else{
			//正在游戏中则过一段时间后再次发起再次解散
			GameRemote.liveTimer[index] = setTimeout(finishGameOfTimer(index),10 * 60 * 1000)
		}
	}
}


//游戏开始回调
local.beginCB = function(roomId,player,rate,currencyType) {
	if(GameRemote.roomList[roomId].coverCharge == conf.MODE_CHARGE_AA){
		if(currencyType !== "diamond"){
			currencyType = "gold"
		}
		var tmpRate = Math.floor(rate * 0.5)
		//代理分成列表
		var agencyDivides = {}
		for(var index in player){
			if(player.hasOwnProperty(index)){
				if(player[index].isActive){
					player[index].score -= tmpRate
					if(!player[index].isRobot){
						GameRemote.app.rpc.db.remote.setValue(null,player[index].uid,currencyType,-tmpRate,"AA手续费",function(){})
						//代理抽水
						// console.log(player[index].playerInfo)
						var agencyId = player[index].playerInfo.agencyId
						if(agencyId){
							if(!agencyDivides[agencyId]){
								agencyDivides[agencyId] = {}
							}
							agencyDivides[agencyId][player[index].uid] = Math.floor(tmpRate * 0.4)
						}
					}
				}
			}
		}
		GameRemote.app.rpc.db.agency.addAgncyDivide(null,agencyDivides,function() {})
		//通知游戏消耗
		var notify = {
			"cmd" : "beginConsume",
			"rate" : tmpRate
		}
		GameRemote.roomList[roomId].sendAll(notify)		
	}
}


//小结算回调
local.settlementCB = function(roomId,curScores,player,rate,currencyType) {
	//更改金币
	if(currencyType !== "diamond"){
		currencyType = "gold"
	}
	for(var index in curScores){
		if(curScores.hasOwnProperty(index)){
			if(curScores){
				if(player[index].isActive && !player[index].isRobot){
					GameRemote.app.rpc.db.remote.setValue(null,player[index].uid,currencyType,curScores[index],"游戏结算",function(){})				
				}
			}
		}
	}
	//通知后台
	var gold_arr = []
	for(var index in player){
		if(curScores[index] && player[index].isActive){
			gold_arr.push({"uid" : player[index].uid,"score" : curScores[index]})
		}
	}
	var WinCharge
	if(GameRemote.roomList[roomId].coverCharge == conf.MODE_CHARGE_WIN){
   		//大赢家付费模式扣除服务费
		var tmpWinIndex = 0
		var tmpScore = curScores[0] || 0
		for(var i in curScores){
			if(curScores[i] && curScores[i] > tmpScore){
			  tmpWinIndex = i
			  tmpScore = curScores[i]
			}
		}
		WinCharge = Math.ceil(curScores[tmpWinIndex] * 0.05)
		GameRemote.app.rpc.db.remote.setValue(null,player[tmpWinIndex].uid,currencyType,-WinCharge,"大赢家手续费",function(){})
		var tmpNotify = {
			"cmd" : "winCharge",
			"charge" : WinCharge,
			"chair" : tmpWinIndex
		}
		GameRemote.roomList[roomId].sendAll(tmpNotify)
	}
	var tmpRate = Math.floor(rate * 0.5)
	var notify = {
		"room_num" : roomId,
		"gold_arr" : gold_arr,
		"pay_gold" : tmpRate,
		"game_mode" : GameRemote.roomList[roomId].roomType,
		"rate" : rate,
		"initiativeFlag" : GameRemote.roomList[roomId].initiativeFlag,
		"WinCharge" : WinCharge
	}
	httpConf.sendGameSettlement(notify)	
	//console.log(player)
	//console.log("rate : "+rate)
	//货币等于0退出游戏
	for(var index in player){
		if(player.hasOwnProperty(index)){
			if(player[index].isActive){
				if(player[index].score < rate * 50){
					//退出游戏
					var notify = {
						"cmd" : "goldNotEnoughOut"
					}
					GameRemote.roomList[roomId].sendUid(player[index].uid,notify)
					local.quitRoom(player[index].uid,roomId,function(){})
				}
			}
		}
	}
	//通知可以抽奖
	// for(var index in player){
	// 	if(player.hasOwnProperty(index)){
	// 		if(player[index].isActive){
	// 			if(player[index].gameCount >= 5){
	// 				var notify = {
	// 					"cmd" : "canLotto"
	// 				}
	// 				GameRemote.roomList[roomId].sendUid(player[index].uid,notify)
	// 			}
	// 		}
	// 	}
	// }
}

//房间结束回调
local.gemeOver = function(roomId,players,type) {
	clearTimeout(GameRemote.liveTimer[roomId])
	for(var i = 0;i < players.length;i++){
		if(players[i].isActive){
			delete GameRemote.userMap[players[i].uid]
		}
	}
	var info = "gemeOver   gold Room finish   roomId  : "+ roomId
	goldLogger.info(info)
	GameRemote.app.rpc.goldGame.remote.gameOver(null,roomId,players,type,function(){})
	GameRemote.roomList[roomId].gameOver()
	GameRemote.roomList[roomId] = false
}
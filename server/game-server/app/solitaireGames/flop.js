//翻牌机
//游戏逻辑算法
var logic = require("./logic/flopLogic.js")
//配置文件
var conf = require("../conf/niuniuConf.js").niuConf
//创建单人房间
module.exports.createRoom = function(roomId,channelService,userInfo,beginCB,settlementCB,gemeOverCB) {
	//初始化房间信息
	var room = {}
	room.roomId = roomId
	room.gameMode = conf.MODE_GAME_FLOP  
	room.state = conf.GS_FREE
	channelService.destroyChannel(roomId)
	room.channel = channelService.getChannel(roomId,true)
	room.channel.add(userInfo.uid,userInfo.sid)

	room.handle = {}
	//================================//
	//初始化玩家信息
	var player = {}
	player.playerInfo = userInfo
	player.isOnline = true
	player.score = parseInt(userInfo.gold)
	player.handCard = new Array(5)

	//================================//
	//初始化牌组
	var cards = logic.shuffle()
	var result ={}
	var bet = 0
	//房间私有方法
	var local = {}

	local.gameBegin = function() {
		//改变状态
		room.state = conf.GS_GAMEING
		//发牌
        for(var i = 0;i < 5;i++){
          player.handCard[i] = cards[i];
        }
        result = logic.getType(player.handCard)
        var notify = {
        	"cmd" : "oneHandCard",
        	"handCard" : player.handCard
        }
        local.sendAll(notify)
		//开始回调
		beginCB(roomId,bet)
	}
	local.againBegin = function(list) {
		//再次翻牌
		room.state = conf.GS_DEAL
		for(var i = 0;i < list.length;i++){
			//随机一个牌组里的牌进行交换
			var rand = Math.floor(Math.random() * 48.9999999) + 5
	    	var tmpCard = cards[rand]
	    	cards[rand] = player.handCard[list[i]]
	    	player.handCard[list[i]] = tmpCard
		}
		result = logic.getType(player.handCard)
        var notify = {
        	"cmd" : "towHandCard",
        	"handCard" : player.handCard
        }
        local.sendAll(notify)
        local.settlement()
	}
	local.settlement = function() {
		console.log(result)
		var award = bet * result.award
		console.log("award : " + award)
		bet = 0
		//结算回调
		settlementCB(roomId,award)
		room.state = conf.GS_FREE
	}
	local.gameOver = function() {
		channelService.destroyChannel(roomId)
		var notify = {
			cmd : "gameOver"
		}
		local.sendAll(notify)
		// 结束回调
		gemeOverCB(roomId)
	}

	//================================//
	//玩家操作
	
	//押注
	room.handler.bet = function(value,cb) {
		if(typeof(value) != "number" || value < 0 || value > player.score){
			cb(false)
			return
		}
		bet = value
		cb(true)
		return
	}
	//开始发牌
	room.handler.begin = function(cb) {
		if(room.state != conf.GS_FREE){
			cb(false)
			return
		}
		local.gameBegin()
	}
	//翻牌
	room.handler.again = function(cb) {
		if(room.state != conf.GS_GAMEING){
			cb(false)
			return
		}
		local.againBegin()
	}

	//================================//
	
    //公共方法
    local.sendAll = function(notify) {
    	//发送消息
     	room.channel.pushMessage('onMessage',notify)
    }
    //解散房间
	room.finishGame = function() {
		local.gameOver()
	}
	//玩家是否在线
	room.isOnline = function() {
		return player.isOnline
	}
	//玩家重连
	room.reconnection = function(uid,sid,cb) {
		player.isOnline = true
		if(room.channel.getMember(uid)){
			//若存在则移除
			var tsid = room.channel.getMember(uid)['sid']
			if(tsid){
				room.channel.leave(uid,tsid)
			}
		}
		room.channel.add(uid,sid)	
		var notify = {
			cmd : "roomPlayer",
			player : player,
			state : room.state,
			gameMode : room.gameMode,
			roomId : room.roomId
		}
		cb(notify)
	}
	//玩家离线
	room.leave = function(uid) {
		player.isOnline = false
      	var tsid =  room.channel.getMember(uid)['sid']
		if(tsid){
			room.channel.leave(uid,tsid)
		}
	}
	//玩家退出
	room.userQuit = function(cb) {
		//空闲状态才能退出
		if(room.state != conf.GS_FREE){
			cb(false)
			return
		}
		room.finishGame()
		cb(true)
	}
	return room
}
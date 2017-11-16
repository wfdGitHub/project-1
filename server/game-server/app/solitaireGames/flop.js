//翻牌机
//游戏逻辑算法
var logic = require("./logic/flopLogic.js")
//配置文件
var conf = require("../conf/niuniuConf.js").niuConf
//创建单人房间
module.exports.createRoom = function(roomId,channelService,userInfo,beginCB,settlementCB,gemeOverCB) {
	console.log("roomId : "+roomId)
	console.log(userInfo)
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
	player.uid = userInfo.uid
	player.isActive = true
	//================================//
	//初始化牌组
	var cards = logic.shuffle()
	var result ={}
	var bet = 0
	//房间私有方法
	var local = {}
	var award = 0
	var casinoTimer = 0
	var casinoFlag = 1   //1 小  2 大
	local.gameBegin = function() {
		casinoTimer = 0
		//改变状态
		room.state = conf.GS_GAMEING
		cards = logic.shuffle()
		//发牌
        for(var i = 0;i < 5;i++){
          player.handCard[i] = cards[i];
        }
        result = logic.getType(player.handCard)
        var notify = {
        	"cmd" : "onceBegin",
        	"handCard" : player.handCard,
        	"result" : result
        }
        local.sendAll(notify)
		//开始回调
		beginCB(roomId,player.uid)
	}
	local.againBegin = function(list) {
		//再次翻牌
		room.state = conf.GS_DEAL
		for(var i = 0;i < list.length;i++){
			if(list[i] >= 0 && list[i] < 5){
				//随机一个牌组里的牌进行交换
				var rand = Math.floor(Math.random() * 48.9999999) + 5
		    	var tmpCard = cards[rand]
		    	cards[rand] = player.handCard[list[i]]
		    	player.handCard[list[i]] = tmpCard
			}
		}
		result = logic.getType(player.handCard)
		award = bet * result.award
        var notify = {
        	"cmd" : "againBegin",
        	"handCard" : player.handCard,
        	"result" : result,
        	"award" : award,
        	"bet" : bet
        }
        local.sendAll(notify)
		if(award == 0){
			local.settlement()
		}else{
			room.state = conf.GS_CASINOWAR
		}
	}

	local.casinoWar  = function(flag) {
		casinoTimer++
		casinoFlag = flag
		//比大小
		if(Math.random() < 0.5){
			award *= 2
			var notify = {
				"cmd" : "casinoWar",
				"isWin" : true,
				"award" : award,
				"casinoTimer" : casinoTimer
			}			
			if(casinoFlag == 1){
				//押小出小
				var card = {}
				card.num = Math.floor(Math.random() * 6.9999) + 1
				card.type = Math.floor(Math.random() * 3.9999)
				notify.card = card
			}else{
				//押大出大
				var card = {}
				card.num = Math.floor(Math.random() * 5.9999) + 8
				card.type = Math.floor(Math.random() * 3.9999)
				notify.card = card				
			}
			local.sendAll(notify)
		}else{
			award = 0
			var notify = {
				"cmd" : "casinoWar",
				"isWin" : true,
				"award" : award
			}			
			if(casinoFlag == 1){
				//押小出大
				var card = {}
				card.num = Math.floor(Math.random() * 5.9999) + 8
				card.type = Math.floor(Math.random() * 3.9999)
				notify.card = card
			}else{
				//押大出小
				var card = {}
				card.num = Math.floor(Math.random() * 6.9999) + 1
				card.type = Math.floor(Math.random() * 3.9999)
				notify.card = card				
			}
			local.sendAll(notify)
			local.settlement()
		}
		if(casinoTimer >= 3){
			local.settlement()
		}
	}

	local.settlement = function() {
		console.log(result)
		var tmpAward = award
		var tmpBet = bet
		award -= bet
		console.log("award : " + award)
		bet = 0
		player.score += award
        var notify = {
        	"cmd" : "settlement",
        	"award" : tmpAward,
        	"bet" : bet,
        	"curScore" : player.score
        }
        local.sendAll(notify)
		//结算回调
		settlementCB(roomId,player.uid,award)
		room.state = conf.GS_FREE
	}
	room.gameOver = function() {
		channelService.destroyChannel(roomId)
		var notify = {
			cmd : "gameOver"
		}
		local.sendAll(notify)
	}

	//================================//
	//玩家操作
	
	//押注
	room.handle.bet = function(uid,sid,params,cb) {
		if(room.state != conf.GS_FREE){
			cb(false)
			return
		}
		if(typeof(params.value) != "number" || params.value < 0 || params.value > player.score){
			cb(false)
			return
		}
		bet = params.value
		cb(true)
		return
	}
	//开始发牌
	room.handle.begin = function(uid,sid,params,cb) {
		if(room.state != conf.GS_FREE){
			cb(false)
			return
		}
		//下注限制
		if(bet <= 0){
			cb(false)
			return
		}
		cb(true)
		local.gameBegin()
	}
	//再次翻牌
	room.handle.again = function(uid,sid,params,cb) {
		if(room.state != conf.GS_GAMEING){
			cb(false)
			return
		}
		if(typeof(params.list) != "object" || params.list.length > 5){
			console.log(params.list)
			cb(false)
			return
		}
		cb(true)
		local.againBegin(params.list)
	}
	//比大小
	room.handle.casinoWar = function(uid,sid,params,cb) {
		if(room.state != conf.GS_CASINOWAR){
			cb(false)
			return
		}
		if(!params.casinoFlag || typeof(params.casinoFlag) != "number" || params.casinoFlag < 1 || params.casinoFlag > 2){
			console.log("params.casinoFlag error : "+params.casinoFlag)
			cb(false)
			return
		}
		cb(true)
		local.casinoWar(params.casinoFlag)
	}
	room.handle.over = function(uid,sid,params,cb) {
		if(room.state != conf.GS_CASINOWAR){
			cb(false)
			return
		}
		cb(true)
		local.settlement()
	}
	//================================//
	
    //公共方法
    local.sendAll = function(notify) {
    	//发送消息
     	room.channel.pushMessage('onMessage',notify)
    }
    //解散房间
	room.finishGame = function() {
		room.gameOver()
		// 结束回调
		gemeOverCB(roomId,player)
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
	room.userQuit = function(uid,cb) {
		//空闲状态才能退出
		if(room.state != conf.GS_FREE){
			cb(false)
			return
		}
		room.finishGame()
		cb(true,uid)
	}
	return room
}
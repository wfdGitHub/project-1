//游戏逻辑算法
var logic
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
	//================================//
	//初始化玩家信息
	var player = {}
	player.playerInfo = userInfo
	player.isOnline = true
	//================================//
	

	//房间私有方法
	var local = {}

	local.gameBegin = function() {
		//开始回调
		beginCB(roomId)
	}
	local.settlement = function() {
		//结算回调
		settlementCB(roomId)
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
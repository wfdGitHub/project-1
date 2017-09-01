var logic = require("../logic/NiuNiuLogic.js")

module.exports.createRobot = function(roomInfo,player,handler,quitRoom,conf) {
	var local = {}
	var robot = {}
	robot.handler = handler
	robot.conf = conf
	robot.player = player
	robot.roomInfo = roomInfo
	robot.timer = 0
	var quitRoomFun = quitRoom
	var gameCount = 0
	var gameBet = roomInfo.basicType
    var betType = {
      "1" : [1,2],
      "2" : [2,4],
      "3" : [4,8],
      "4" : [1,3,5],
      "5" : [2,4,6]
    } 
    var typeWeight = [1,1,1,1,2,2,2,3,3,3,3,3,3,3,3]
    var result
	robot.receive = function(uid,notify) {
		var cmd = notify.cmd
		if(!robot.player.isReady){
			return
		}		
		//console.log("cmd : "+cmd)
		switch(cmd){
			case "userJoin":
				break
			case "userReconnection":
				break
			case "userDisconne":
				break
			case "userQuit":
				break
			case "roomPlayer":
				//加入游戏
				//console.log("roomPlayer   state : "+robot.conf.GS_FREE + " notify state : "+notify.state)
				// if(notify.state == robot.conf.GS_FREE){
				// 	local.delaySend(uid,"ready",{},function(flag) {
				// 		if(flag == false){
				// 			console.log("ready error")
				// 		}
				// 	})
				// }
				break
			case "gameBegin":
				
				break
			case "beginRob":
				//开始抢庄
				result = logic.getType(robot.player.handCard)
				var max = 0
				if(result.type >= 10){
					if(Math.random() > 0.4){
						max = 4
					}else{
						max = 0
					}
				}else if(result.type > 5){
					var rand = Math.random()
					if(rand < 0.3){
						max = 4
					}else if(rand < 0.8){
						max = 3
					}else{
						max = 0
					}
				}else{
					var rand = Math.random()
					if(rand < 0.05){
						max = 4
					}else if(rand < 0.1){
						max = 3
					}else if(rand < 0.15){
						max = 2
					}else if(rand < 0.2){
						max = 1
					}else{
						max = 0
					}
				}
				local.delaySend(uid,"useCmd",{"cmd" : "robBanker" , "num" : max},3000,function(flag) {
					if(flag == false){
						console.log("beginRob error")
					}
				})
				break
			case "beginBetting":
				//开始下注
				if(!robot.player.isBanker){
					//判断牌型
					var rand = typeWeight[result.type]
					if(result.type > 10){
						rand = 3
					}else{
						rand += Math.floor(Math.random() * 2) - 1
						if(rand > 3){
							rand = 3
						}
						if(rand < 0){
							rand = 0
						}
					}
					bet = betType[gameBet][rand]
					local.delaySend(uid,"useCmd",{"cmd" : "bet" , "bet" : bet},3000,function(flag) {
						if(flag == false){
							console.log("beginBetting error : max : "+bet)
						}
					})						
				}
				break
			case "deal":
				//开始发牌
				local.delaySend(uid,"showCard",{},5000,function(flag) {
					if(flag == false){
						console.log("deal error")
					}
				})
				break
			case "settlement":
				gameCount++
				//概率离开
				if(gameCount > 5 && Math.random() < 0.15){
					quitRoomFun(robot.player.uid,robot.roomInfo.roomId)
				}
				break
			case "showCard":
				//
				break
			case "robBanker":
				break
			case "bet":
				break
			case "allIn":
				break

		}
	}
	robot.destroy = function() {
		clearTimeout(robot.timer)
	}
	local.delaySend = function(uid,cmd,param,time,cb) {
		var newtime = Math.random() * time + 2000
		console.log("newTime : "+newtime)
		robot.timer = setTimeout(function() {
			local.send(uid,cmd,param,cb)
		},newtime)
	}
	local.send = function(uid,cmd,param,cb) {
		robot.handler[cmd](uid,null,param,cb)
	}

	return robot
}



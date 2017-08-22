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
	robot.receive = function(uid,notify) {
		var cmd = notify.cmd
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
				//开始游戏
				break
			case "beginRob":
				//开始抢庄
				if(Math.random() > 0.3){
					var max = Math.floor(Math.random() * 1024) % 4 + 1
					local.delaySend(uid,"useCmd",{"cmd" : "robBanker" , "num" : max},3000,function(flag) {
						if(flag == false){
							console.log("beginRob error")
						}
					})					
				}else{
					local.delaySend(uid,"useCmd",{"cmd" : "robBanker" , "num" : 0},3000,function(flag) {
						if(flag == false){
							console.log("beginRob error")
						}
					})
				}
				break
			case "beginBetting":
				//开始下注
				var max = Math.random() > 0.5 ? 1 : 2
				max *= robot.roomInfo.basic
				local.delaySend(uid,"useCmd",{"cmd" : "bet" , "bet" : max},5000,function(flag) {
					if(flag == false){
						console.log("beginBetting error : max : "+max)
					}
				})					
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
		robot.timer = setTimeout(function() {
			local.send(uid,cmd,param,cb)
		},newtime)
	}
	local.send = function(uid,cmd,param,cb) {
		robot.handler[cmd](uid,null,param,cb)
	}

	return robot
}



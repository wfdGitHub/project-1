//解散房间
var frame = module.exports
var local = {}
var GameService
//设置GameService
frame.start = function(GameService) {
	frame.GameService = GameService
}

frame.onFrame = function(params,uid,code,cb) {
	switch(code){
		case "finish" : 
		case "userQuit" :
			if(!frame.GameService.userMap[uid]){
				cb(false)
				return
			}	
			var roomId = frame.GameService.userMap[uid]
			//不能重复发送
			if(frame.GameService.roomLock[roomId] === false){
				cb(false)
				return
			}
			if(frame.GameService.roomList[roomId].isBegin()){
				//游戏已开始为解散
				//锁定房间
				frame.GameService.roomLock[roomId] = false
				frame.GameService.lockState[roomId] = {}
				//通知其他玩家
				var chair = frame.GameService.roomList[roomId].chairMap[uid]
				var notify = {
					"cmd" : "finishGame",
					"chair" : chair
				}
				frame.GameService.roomList[roomId].channel.pushMessage('onMessage',notify)
				//发起解散的玩家默认同意
				local.responseFinish(roomId,chair,true)
				//三分钟后默认同意
				var timerCb = function(roomId) {
					return function() {
						var gamePlayer = frame.GameService.roomList[roomId].GAME_PLAYER
						for(var i = 0;i < gamePlayer;i++){
							if(frame.GameService.lockState[roomId][i] != false){
								frame.GameService.lockState[roomId][i] = true
							}
						}
						local.endFinish(roomId)
					}
				}(roomId)
				frame.GameService.lockTimer[roomId] = setTimeout(timerCb,180 * 1000)
				cb(true)
			}else{
				//游戏未开始则为退出
				if(frame.GameService.roomList[roomId].userQuit){
					frame.GameService.roomList[roomId].userQuit(uid,function() {
						delete frame.GameService.userMap[uid]
						frame.GameService.app.rpc.game.remote.userQuit(null,uid,function() {})
					})
				}
				cb(true)
			}
			break
		case "agreeFinish" :
			if(!frame.GameService.userMap[uid]){
				cb(false)
				return
			}
			var roomId = frame.GameService.userMap[uid]
			//房间必须已锁定
			if(frame.GameService.roomLock[roomId] == true){
				cb(false)
				return
			}
			var chair = frame.GameService.roomList[roomId].chairMap[uid]
			//已发送不能再次发送
			if(frame.GameService.lockState[roomId][chair] !== undefined){
				cb(false)
				return
			}
			local.responseFinish(roomId,chair,true)
			cb(true)
			break
		case "refuseFinish" :
			if(!frame.GameService.userMap[uid]){
				cb(false)
				return
			}
			var roomId = frame.GameService.userMap[uid]
			//房间必须已锁定
			if(frame.GameService.roomLock[roomId] == true){
				cb(false)
				return
			}
			var chair = frame.GameService.roomList[roomId].chairMap[uid]
			//已发送不能再次发送
			if(frame.GameService.lockState[roomId] && frame.GameService.lockState[roomId][chair] !== undefined){
				cb(false)
				return
			}
			local.responseFinish(roomId,chair,false)
			cb(true)
			break
		case "agencyFinish" :
			var roomId = params.roomId
			if(!frame.GameService.roomList[roomId] || frame.GameService.roomList[roomId].agencyId !== uid){
				cb(false)
				return
			}
			if(frame.GameService.roomList[roomId].isBegin()){
				cb(false)
				return
			}
			frame.GameService.roomList[roomId].finishGame()
			cb(true)
			break;
	}
}

local.responseFinish = function(roomId,chair,flag) {
	//记录响应状态
	frame.GameService.lockState[roomId][chair] = flag
	//console.log(frame.GameService.lockState[roomId])
	var notify = {
		"cmd" : "responseFinish",
		"chair" : chair,
		"result" : flag
	}
	frame.GameService.roomList[roomId].channel.pushMessage('onMessage',notify)
	//同意人数大于等于一半   或者拒绝人数大于一半结束请求
	var roomPlayer = frame.GameService.roomList[roomId].getPlayerCount()
	var agreeCount = 0
	var refuseCount = 0
	for(var index in frame.GameService.lockState[roomId]){
		if(frame.GameService.lockState[roomId].hasOwnProperty(index)){
			//console.log("chair : "+chair +"    "+frame.GameService.lockState[roomId][chair])
			if(frame.GameService.lockState[roomId][index] == true){
				agreeCount++
			}else{
				refuseCount++
			}
		}
	}
	// console.log("roomPlayer : "+roomPlayer)
	// console.log("agreeCount : "+agreeCount)
	// console.log("refuseCount : "+refuseCount)
	if(agreeCount > roomPlayer/2){
		//console.log("enfFinish true")
		local.endFinish(roomId)
	}else if(refuseCount >= roomPlayer/2){
		//console.log("enfFinish flase")
		local.endFinish(roomId)
	}
}
local.endFinish = function(roomId) {
	//清除定时器
	clearTimeout(frame.GameService.lockTimer[roomId])
	delete frame.GameService.lockTimer[roomId]
	//结束响应请求
	var roomPlayer = frame.GameService.roomList[roomId].getPlayerCount()
	var agreeCount = 0
	var refuseCount = 0
	for(var index in frame.GameService.lockState[roomId]){
		if(frame.GameService.lockState[roomId].hasOwnProperty(index)){
			if(frame.GameService.lockState[roomId][index] == true){
				agreeCount++
			}else{
				refuseCount++
			}
		}
	}
	if(agreeCount > roomPlayer/2){
		var notify = {
			"cmd" : "endFinish",
			"result" : true
		}
		frame.GameService.roomList[roomId].channel.pushMessage('onMessage',notify)
		//解散房间
		if(frame.GameService.roomList[roomId].finishGame){
			frame.GameService.roomList[roomId].finishGame()
		}
	}else if(refuseCount >= roomPlayer/2){
		//不解散房间
		var notify = {
			"cmd" : "endFinish",
			"result" : false
		}
		frame.GameService.roomList[roomId].channel.pushMessage('onMessage',notify)
	}
	frame.GameService.roomLock[roomId] = true
	frame.GameService.lockState[roomId] = {}
}
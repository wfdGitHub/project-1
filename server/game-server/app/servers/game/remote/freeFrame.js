//解散房间
var frame = module.exports

var GameService
//设置GameService
frame.start = function(GameService) {
	GameService = GameService
}

frame.onFrame = function(uid, sid,code,params,cb) {
	switch(code){
		case "finish" : 
		case "userQuit" :
			if(!GameService.userMap[uid]){
				cb(false)
				return
			}	
			var roomId = GameService.userMap[uid]
			//不能重复发送
			if(GameService.roomLock[roomId] == false){
				cb(false)
				return
			}
			if(GameService.roomList[roomId].isBegin()){
				//游戏已开始为解散
				//只有空闲时间能解散
				if(!GameService.roomList[roomId].isFree()){
					cb(false)
					return
				}
				//锁定房间
				GameService.roomLock[roomId] = false
				//通知其他玩家
				var chair = GameService.roomList[roomId].chairMap[uid]
				var notify = {
					"cmd" : "finishGame",
					"chair" : chair
				}
				GameService.roomList[roomId].channel.pushMessage('onMessage',notify)
				//发起解散的玩家默认同意
				local.responseFinish(roomId,chair,true)
				//三分钟后默认同意
				var timerCb = function(roomId) {
					return function() {
						var gamePlayer = GameService.roomList[roomId].GAME_PLAYER
						for(var i = 0;i < gamePlayer;i++){
							if(GameService.lockState[roomId][i] != false){
								GameService.lockState[roomId][i] = true
							}
						}					
						local.endFinish(roomId)
					}
				}(roomId)
				GameService.lockTimer[roomId] = setTimeout(timerCb,180 * 1000)
				cb(true)
			}else{
				//游戏未开始则为退出
				if(GameService.roomList[roomId].userQuit){
					GameService.roomList[roomId].userQuit(uid,function() {
						delete GameService.userMap[uid]
					})
				}			
				cb(true)				
			}
			break
		case "agreeFinish" :
			if(!GameService.userMap[uid]){
				cb(false)
				return
			}
			var roomId = GameService.userMap[uid]	
			//房间必须已锁定		
			if(GameService.roomLock[roomId] == true){
				cb(false)
				return
			}
			var chair = GameService.roomList[roomId].chairMap[uid]
			//已发送不能再次发送
			if(GameService.lockState[roomId][chair] !== undefined){
				cb(false)
				return
			}
			local.responseFinish(roomId,chair,true)
			cb(true)
			break
		case "refuseFinish" :
			if(!GameService.userMap[uid]){
				cb(false)
				return
			}
			var roomId = GameService.userMap[uid]	
			//房间必须已锁定		
			if(GameService.roomLock[roomId] == true){
				cb(false)
				return
			}
			var chair = GameService.roomList[roomId].chairMap[uid]
			//已发送不能再次发送
			if(GameService.lockState[roomId][chair] !== undefined){
				cb(false)
				return
			}
			local.responseFinish(roomId,chair,false)
			cb(true)
			break
	}
}

local.responseFinish = function(roomId,chair,flag) {
	//记录响应状态
	GameService.lockState[roomId][chair] = flag
	//console.log(GameService.lockState[roomId])
	var notify = {
		"cmd" : "responseFinish",
		"chair" : chair,
		"result" : flag
	}
	GameService.roomList[roomId].channel.pushMessage('onMessage',notify)
	//同意人数大于等于一半   或者拒绝人数大于一半结束请求
	var roomPlayer = GameService.roomList[roomId].getPlayerCount()
	var agreeCount = 0
	var refuseCount = 0
	for(var index in GameService.lockState[roomId]){
		if(GameService.lockState[roomId].hasOwnProperty(index)){
			//console.log("chair : "+chair +"    "+GameService.lockState[roomId][chair])
			if(GameService.lockState[roomId][index] == true){
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
	clearTimeout(GameService.lockTimer[roomId])
	delete GameService.lockTimer[roomId]
	//结束响应请求
	var roomPlayer = GameService.roomList[roomId].getPlayerCount()
	var agreeCount = 0
	var refuseCount = 0
	for(var index in GameService.lockState[roomId]){
		if(GameService.lockState[roomId].hasOwnProperty(index)){
			if(GameService.lockState[roomId][index] == true){
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
		GameService.roomList[roomId].channel.pushMessage('onMessage',notify)
		//解散房间
		if(GameService.roomList[roomId].finishGame){
			GameService.roomList[roomId].finishGame()
		}
	}else if(refuseCount >= roomPlayer/2){
		//不解散房间
		var notify = {
			"cmd" : "endFinish",
			"result" : false
		}
		GameService.roomList[roomId].channel.pushMessage('onMessage',notify)
	}
	GameService.roomLock[roomId] = true
	GameService.lockState[roomId] = {}
}
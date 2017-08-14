var frame =   module.exports
var conf = require("../../conf/niuniuConf.js").niuConf
frame.waitFlag = true   //离线等待

frame.start = function(isWait) {
  frame.waitFlag = isWait
}

frame.ready = function (uid,chair,player,gameState,local,nextcb,banker,cb) {
   //游戏状态为空闲时才能准备
  if(gameState !== conf.GS_FREE){
    cb(false)
    return
  }
  if(player[chair].isReady === false){
    player[chair].isReady = true
    var notify = {
      cmd: "userReady",
      uid: uid,
      chair : chair
    }
    local.sendAll(notify)
    //房间内玩家全部准备且人数大于2时开始游戏
    var readyFlag = true
    var readyCount = 0
    for(var index in player){
    	if(player.hasOwnProperty(index)){
    		if(player[index].isActive){
          //准备玩家数
    			if(player[index].isReady){
    				readyCount++
    			}
          if(frame.waitFlag){
            //全部玩家中有人未准备则不开始
            if(player[index].isReady == false){
              readyFlag = false
            }
          }else{
            //在线玩家中有人未准备则不开始
            if(player[index].isReady == false && player[index].isOnline){
              readyFlag = false
            }            
          }
    		}
    	}
    }
    console.log("banker : "+banker)
    if(banker >= 0 && player[banker] && !player[banker].isReady){
      readyFlag = false
    }
    if(readyFlag && readyCount >= 2){
        //console.log("beginGame")
        //发送游戏开始消息
        notify = {
          "cmd" : "gameStart"
        }
        local.sendAll(notify)
        //TODO游戏开始
        nextcb()
    }      
  }
  cb(true)
}


frame.disconnect = function(chair,player,gameState,local,nextcb) {
	//离线时判断是否可以开始游戏
	if(gameState !== conf.GS_FREE){
		return
	}	
  //房间内玩家全部准备且人数大于2时开始游戏
  var readyFlag = true
  var readyCount = 0
  for(var index in player){
    if(player.hasOwnProperty(index)){
      if(player[index].isActive){
        //准备玩家数
        if(player[index].isReady){
          readyCount++
        }
        if(frame.waitFlag){
          //全部玩家中有人未准备则不开始
          if(player[index].isReady == false){
            readyFlag = false
          }            
        }else{
          //在线玩家中有人未准备则不开始
          if(player[index].isReady == false && player[index].isOnline){
            readyFlag = false
          }            
        }
      }
    }
  }
  if(readyFlag && readyCount >= 2){
      //console.log("beginGame")
      //发送游戏开始消息
      notify = {
        "cmd" : "gameStart"
      }
      local.sendAll(notify)
      //TODO游戏开始
      nextcb()
  }      
}

var frameFactory =   module.exports
var conf = require("../../conf/niuniuConf.js").niuConf
var waitTime = 10000

frameFactory.createFrame = function() {
  var frame = {}
  frame.waitFlag = 1   // 0 离线不等待 1 离线等待  2 准备倒计时
  frame.timer = false

  frame.start = function(flag) {
    frame.waitFlag = flag
  }


  frame.begin = function() {
    //游戏开始回调
    clearTimeout(frame.timer)
    frame.timer = false
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
            if(frame.waitFlag == 1){
              //全部玩家中有人未准备则不开始
              if(player[index].isReady == false){
                readyFlag = false
              }
            }else if(frame.waitFlag == 0 || frame.waitFlag == 2){
              //在线玩家中有人未准备则不开始
              if(player[index].isReady == false && player[index].isOnline){
                readyFlag = false
              }
            }
          }
        }
      }
      //当庄家未准备时不能开始
      if(banker >= 0 && player[banker] && !player[banker].isReady){
        return
      }
      if(readyCount >= 2){
        if(frame.waitFlag == 2){
          //准备倒计时    当已准备玩家大于最低玩家数量后开始游戏
          if(readyFlag){
              //console.log("beginGame")
              //发送游戏开始消息
              notify = {
                "cmd" : "gameStart"
              }
              local.sendAll(notify)
              //TODO游戏开始
              clearTimeout(frame.timer)
              nextcb()
          }else if(frame.timer === false){
            clearTimeout(frame.timer)
            notify = {
              "cmd" : "readyBegin",
              "waitTime" : waitTime
            }
            local.sendAll(notify) 
            frame.timer = setTimeout(function(){
              notify = {
                "cmd" : "gameStart"
              }
              local.sendAll(notify)
              //TODO游戏开始
              nextcb()
            },waitTime)
          }
        }else{
          if(readyFlag){
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

  return frame
}
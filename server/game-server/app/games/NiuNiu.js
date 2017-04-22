//常量定义
var GAME_PLAYER = 1                 //游戏人数
var GS_FREE     = 1001              //空闲状态        
var GS_PLAYING  = 1002              //游戏状态

//创建房间
  module.exports.createRoom = function(roomId,channelService) {

    console.log("createRoom"+roomId)
    var room = {}
    room.roomId = roomId
    room.channel = channelService.getChannel(roomId,true)

    //房间属性
    var playerCount  = 0                 //房间内玩家人数
    var readyCount = 0                   //游戏准备人数
    var gameState = GS_FREE              //游戏状态
    var chairMap = {}                    //玩家UID与椅子号映射表

    //游戏属性
    var cards = {}                       //牌组
    var cardCount = 0                    //卡牌剩余数量
    for(var i = 1;i <= 13;i++){
      for(var j = 0;j < 4;j++){
        cards[cardCount++] = {num : i,type : j}
      }
    }
    //玩家属性
    var  player = {}
    for(var i = 0;i < GAME_PLAYER;i++){
      player[i] = {}
      player[i].chair = i;                //椅子号
      player[i].uid = 0;                  //uid
      player[i].isActive = false;         //当前椅子上是否有人
      player[i].isReady = false;          //准备状态
    }

    var local = {}                        //私有方法
    //玩家加入
    room.join = function(uid,sid,param,cb) {
      log("serverId"+sid)
      
      //查找空闲位置
      var chair = -1
      for(var i = 0;i < GAME_PLAYER;i++){
          if(player[i].isActive === false){
            chair = i
            break
          }
      }
      log("chair : "+chair)
      if(chair == -1 || !player[chair]){
        cb(false)
        return
      }
      //初始化玩家属性
      chairMap[uid] = chair
      player[chair].isActive = true
      player[chair].uid = uid
      //玩家数量增加
      playerCount++

      room.channel.add(uid,sid)
      var notify = {
        cmd: "userJoin",
        uid: uid,
        chair : chair
      }
      local.sendAll(notify)
      cb(true)
    }
    //玩家离开
    room.leave = function(uid,sid,param,cb) {
      //判断是否在椅子上
      var chair = chairMap[uid]
      if(chair === undefined){
        cb(false)
        return
      }
      player[chair].isActive = false
      playerCount--
      room.channel.leave(uid,sid)
      var notify = {
        cmd: "userLeave",
        uid: uid,
        chair : chair
      }
      local.sendAll(notify)
      cb(true)
    }
    //玩家准备
    room.ready = function(uid,sid,param,cb) {
      //游戏状态为空闲时才能准备
      if(gameState !== GS_FREE){
        cb(false)
        return
      }
      //判断是否在椅子上
      var chair = chairMap[uid]
      if(chair === undefined){
        cb(false)
        return
      }
      if(player[chair].isReady === false){
        player[chair].isReady = true
        readyCount++
      }else{
        player[chair].isReady = false
        readyCount--
      }
      var notify = {
        cmd: "userReady",
        uid: uid,
        chair : chair
      }
      local.sendAll(notify)
      //准备人数等于房间人数时，游戏开始
      if(readyCount == GAME_PLAYER){
          local.gameBegin();
      }
      cb(true)
    }
    room.send = function(uid,sid,param,cb) {
      //判断是否在椅子上
      var chair = chairMap[uid]
      if(chair == undefined){
        cb(false)
        return
      }    
      log("sendMsg")
      var notify = {
        "cmd": "userSend",
        "uid": uid,
        "msg": param.msg
      }
      local.sendAll(notify)
      cb(true)
    }

    //游戏开始
    local.gameBegin = function() {
        //状态改变
        gameState = GS_PLAYING
        //洗牌
        for(var i = 0;i < cardCount;i++){
          var tmpIndex = Math.floor(Math.random() * (cardCount - 0.000001))
          var tmpCard = cards[i]
          cards[i] = cards[tmpIndex]
          cards[tmpIndex] = tmpCard
        }
      var notify = {
        "cmd": "gameBegin"
      }
      local.sendAll(notify)
      notify.cmd = "sendUid"
      local.sendUid(player[0].uid,notify)
    }


    //广播消息
    local.sendAll = function(notify) {
      room.channel.pushMessage('onMessage',notify)    
    }
    //通过uid 单播消息
    local.sendUid = function(uid,notify) {
      var tsid =  room.channel.getMember(uid)['sid']
      channelService.pushMessageByUids('onMessage', notify, [{
        uid: uid,
        sid: tsid
      }]);
    }
    return room 
}


var log = function(str) {
    console.log("LOG NiuNiu : "+str)
}
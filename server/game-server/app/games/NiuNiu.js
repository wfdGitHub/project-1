var logic = require("./NiuNiuLogic.js")

//常量定义
var GAME_PLAYER = 1                 //游戏人数
//游戏状态
var GS_FREE         = 1001              //空闲阶段
var GS_BETTING      = 1002              //下注阶段
var GS_DEAL         = 1003              //发牌阶段
var GS_SETTLEMENT   = 1004              //结算阶段


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
    var banker = -1;                     //庄家椅子号
    //游戏属性
    var cards = {}                       //牌组
    var cardCount = 0                    //卡牌剩余数量
    for(var i = 1;i <= 13;i++){
      for(var j = 0;j < 4;j++){
        cards[cardCount++] = {num : i,type : j}
      }
    }
    //下注信息
    var betList = new Array(GAME_PLAYER)

    //玩家属性
    var  player = {}
    for(var i = 0;i < GAME_PLAYER;i++){
      player[i] = {}
      player[i].chair = i;                //椅子号
      player[i].uid = 0;                  //uid
      player[i].isActive = false          //当前椅子上是否有人
      player[i].isReady = false           //准备状态
      player[i].isBanker = false          //是否为庄家
      player[i].handCard = new Array(5)   //手牌
      player[i].score = 10000;            //当前金币
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

      var notify = {
        cmd: "userJoin",
        uid: uid,
        chair : chair
      }
      local.sendAll(notify)

      room.channel.add(uid,sid)
      notify = {
        cmd : "roomPlayer",
        player:player
      }
      local.sendUid(uid,notify)
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
    //发送聊天
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
    //玩家下注
    room.bet = function(uid,sid,param,cb){
      //游戏状态为BETTING
      if(gameState !== GS_BETTING){
        cb(false)
        return
      }
      //判断是否在椅子上
      var chair = chairMap[uid]
      if(chair === undefined){
        cb(false)
        return
      }
      //判断金钱
      if(param.betting && typeof(param.betting) == "number" && param.betting > 0 &&
        player[chair].score >= (param.betting + betList[chair])){
        betList[chair] += param.betting
        cb(true)
      }else{
        cb(false)
      }

    }
    //游戏开始 进入下注阶段
    local.gameBegin = function() {
        log("gameBegin")
        //状态改变
        gameState = GS_BETTING
        //重置参数
        for(var i = 0;i < GAME_PLAYER;i++){
            betList[i] = 0;
        }
        //通知客户端
        var notify = {
          "cmd": "beginBetting"
        }
        local.sendAll(notify)
        //定时器启动下一阶段
        setTimeout(local.deal,1000)
    }
    //发牌阶段  等待摊牌后进入结算
    local.deal = function(){
        log("deal")
        gameState = GS_BETTING
        //洗牌
        for(var i = 0;i < cardCount;i++){
          var tmpIndex = Math.floor(Math.random() * (cardCount - 0.000001))
          var tmpCard = cards[i]
          cards[i] = cards[tmpIndex]
          cards[tmpIndex] = tmpCard
        }
        var notify = {
          "cmd" : "deal"
        }
        //发牌
        var index = 0;
        for(var i = 0;i < GAME_PLAYER;i++){
            for(var j = 0;j < 5;j++){
                player[i].handCard[j] = cards[index++];
            }
            notify.handCard = player[i].handCard
            local.sendUid(player[i].uid,notify)
        }
        setTimeout(local.settlement,1000)
    }

    //结算阶段
    local.settlement = function(){
        log("settlement")
        gameState = GS_FREE
        for(var i = 0;i < GAME_PLAYER; i++){
            player[i].isReady = false;
        }
        readyCount = 0
        var result = {}
        for(var i = 0;i < GAME_PLAYER;i++){
            result[i] = logic.getType(player[i].handCard);
            console.log(result[i])
        }

        var notify = {
          "cmd" : "settlement",
          "player" : player,
          "result" : result
        }
        local.sendAll(notify)
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
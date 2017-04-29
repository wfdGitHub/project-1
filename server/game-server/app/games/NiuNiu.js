var logic = require("./NiuNiuLogic.js")
//常量定义
var GAME_PLAYER = 1                 //游戏人数
var TID_BETTING = 10000              //下注时间
var TID_SETTLEMENT = 1000           //结算时间
//游戏状态
var GS_FREE         = 1001              //空闲阶段
var GS_BETTING      = 1002              //下注阶段
var GS_DEAL         = 1003              //发牌阶段
var GS_SETTLEMENT   = 1004              //结算阶段


var MODE_BANKER_ROB   = 1              //随机抢庄
var MODE_BANKER_HOST  = 2              //房主做庄
var MODE_BANKER_ORDER = 3              //轮庄
var MODE_BANKER_NONE  = 4              //开船模式 无庄
var MODE_BANKER_SHOW  = 5              //看牌抢庄

var MODE_DIAMOND_HOST = 1              //房主扣钻
var MODE_DIAMOND_EVERY = 2             //每人扣钻
var MODE_DIAMOND_WIN = 3               //大赢家扣钻
//创建房间
module.exports.createRoom = function(roomId,channelService,cb) {
  console.log("createRoom"+roomId)
  var room = {}
  room.roomId = roomId
  room.channel = channelService.getChannel(roomId,true)
  //房间参数
  room.gameMode = 0                    //游戏模式
  room.gameNumber = 0                  //游戏局数
  room.consumeMode = 0                 //消耗模式
  room.needDiamond = 0                 //钻石基数
  //房间属性
  room.state = true                    //房间状态，true为可创建
  room.playerCount  = 0                //房间内玩家人数
  var readyCount = 0                   //游戏准备人数
  var gameState = GS_FREE              //游戏状态
  room.chairMap = {}                   //玩家UID与椅子号映射表
  var banker = -1                      //庄家椅子号
  var roomHost = -1                    //房主椅子号
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
    player[i].score = 0;                //当前积分
  }

  var local = {}                        //私有方法
  //创建房间
  room.newRoom = function(uid,sid,param,cb) {
    log("newRoom"+uid)
      //无效条件判断
    if(!param.gameMode || typeof(param.gameMode) !== "number" || param.gameMode > 5 || param.gameMode < 0){
      log("newRoom error   param.gameMode : "+param.gameMode)
      cb(false)
      return
    }
    if(!param.consumeMode || typeof(param.consumeMode) !== "number" || param.consumeMode > 3 || param.consumeMode < 0){
      log("newRoom error   param.consumeMode : "+param.consumeMode)
      cb(false)
      return
    }
    if(!param.gameNumber || typeof(param.gameNumber) !== "number" || (param.gameNumber != 10 && param.gameNumber != 20)){
      log("newRoom error   param.gameNumber : "+param.gameNumber)
      cb(false)
      return
    }    
    if(room.state === true){
      room.state = false
      room.playerCount  = 0            //房间内玩家人数
      readyCount = 0                   //游戏准备人数
      gameState = GS_FREE              //游戏状态
      room.chairMap = {}               //玩家UID与椅子号映射表
      banker = -1                      //庄家椅子号
      roomHost = 0                     //房主椅子号
      room.gameMode = param.gameMode                     //游戏模式
      room.gameNumber = param.gameNumber                 //游戏局数
      room.consumeMode = param.consumeMode               //消耗模式
      room.needDiamond = Math.ceil(room.gameNumber / 10)
      room.join(uid,sid,null,cb)
    }else{
      cb(false)
    }
  }
  //玩家加入
  room.join = function(uid,sid,param,cb) {
    log("serverId"+sid)
    //房间未创建不可加入
    if(room.state == true){
      cb(false)
      return
    }
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
    room.chairMap[uid] = chair
    player[chair].isActive = true
    player[chair].uid = uid
    //玩家数量增加
    room.playerCount++

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
  //玩家重连
  room.reconnection = function(uid,sid,param,cb) {
    console.log("uid : "+uid + "  reconnection")
    if(room.chairMap[uid] !== undefined){
      var chair = room.chairMap[uid]
      player[chair].isActive = true
      player[chair].uid = uid
      room.channel.add(uid,sid)
      notify = {
      cmd : "reconnection",
      player : player,
      state : gameState
    }
    local.sendUid(uid,notify)
    cb(true)
    }else{
      cb(false)
    }
  }
  //玩家离开
  room.leave = function(uid) {
    //判断是否在椅子上
    var chair = room.chairMap[uid]
    if(chair === undefined){
      return
    }
    player[chair].isActive = false
    //playerCount--
    var tsid =  room.channel.getMember(uid)['sid']
    if(tsid){
      room.channel.leave(uid,tsid)
    }
    var notify = {
      cmd: "userLeave",
      uid: uid,
      chair : chair
    }
    local.sendAll(notify)
  }
  //玩家准备
  room.ready = function(uid,sid,param,cb) {
    //游戏状态为空闲时才能准备
    if(gameState !== GS_FREE){
      cb(false)
      return
    }
    //判断是否在椅子上
    var chair = room.chairMap[uid]
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
    var chair = room.chairMap[uid]
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
    var chair = room.chairMap[uid]
    if(chair === undefined){
      cb(false)
      return
    }
    //庄家不能下注
    if(chair == banker){
      cb(false)
      return
    }
    //判断金钱
    if(param.bet && typeof(param.bet) == "number" 
      && param.bet > 0 && param.bet < player[chair].score
      && player[chair].score / 8 >= (param.bet + betList[chair])){
      betList[chair] += param.bet
      var notify = {
        "cmd" : "bet",
        "chair" : chair,
        "bet" : param.bet
      }
      local.sendAll(notify)
      cb(true)
    }else{
      cb(false)
    }

  }
  //游戏开始 进入下注阶段
  local.gameBegin = function() {
    if(room.gameNumber > 0){
      log("gameBegin")
      room.gameNumber--
      //状态改变
      gameState = GS_BETTING
      //确定庄家
      console.log("room.gameMode : "+room.gameModee)
      switch(room.gameMode){
        case MODE_BANKER_ROB:
          banker = Math.floor(Math.random() * GAME_PLAYER)%GAME_PLAYER
          break
        case MODE_BANKER_ORDER:
          banker = (banker + 1)%GAME_PLAYER
          break
        case MODE_DIAMOND_HOST:
          banker = roomHost
          break;
      }
      //重置参数
      for(var i = 0;i < GAME_PLAYER;i++){
          betList[i] = 0;
          player[i].isBanker = false
      }
      console.log("banker : "+banker)
      player[banker].isBanker = true
      //通知客户端
      var notify = {
        "cmd": "beginBetting"
      }
      local.sendAll(notify)
      //定时器启动下一阶段
      setTimeout(local.deal,TID_BETTING)      
    }
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
      setTimeout(local.settlement,TID_SETTLEMENT)
  }

  //结算阶段
  local.settlement = function(){
      log("settlement")
      //房间重置
      gameState = GS_FREE
      for(var i = 0;i < GAME_PLAYER; i++){
          player[i].isReady = false;
      }
      readyCount = 0

      //计算牌型
      var result = {}
      for(var i = 0;i < GAME_PLAYER;i++){
          result[i] = logic.getType(player[i].handCard); 
          //console.log(result[i])
      }
      //结算积分
      for(var i = 0;i < GAME_PLAYER;i++){
          if(i === banker) continue
          //比较大小
          if(logic.compare(result[i],result[banker])){
              //闲家赢
              local.changeScore(i,betList[i] * result[i].award)
              local.changeScore(banker,- (betList[i] * result[i].award))
          }else{
              //庄家赢
              local.changeScore(banker,betList[i] * result[banker].award)
              local.changeScore(i,-(betList[i] * result[banker].award))
          }
      }
        
      //发送消息
      var notify = {
        "cmd" : "settlement",
        "player" : player,
        "result" : result
      }
      local.sendAll(notify)
      if(room.gameNumber <= 0){
        //总结算
        room.state = true
        var notify = {
          "cmd" : "gameOver"
        }
        local.sendAll(notify)
        //结束游戏
        cb(room.roomId,player)
    }
  }

  //积分改变
  local.changeScore = function(chair,score) {
    if(player[chair].score + score >= 0){
        player[chair].score += score;
        var notify = {
          "cmd" : "changeScore",
          "chair" : chair,
          "difference" : score,
          "score" : player[chair].score
        }      
        local.sendAll(notify)        
    }
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


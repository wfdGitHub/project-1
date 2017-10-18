var logic = require("./logic/NiuNiuLogic.js")
var conf = require("../conf/niuniuConf.js").niuConf
var tips = require("../conf/tips.js").tipsConf
var frame = require("./frame/frame.js")
//常量定义
var TID_ROB_TIME = conf.TID_ROB_TIME    //抢庄时间
var TID_BETTING = conf.TID_BETTING      //下注时间
var TID_SETTLEMENT = conf.TID_SETTLEMENT//结算时间

var MING_CARD_NUM = 4               //明牌数量
//游戏状态
var GS_FREE         = 1001              //空闲阶段
var GS_BETTING      = 1002              //下注阶段
var GS_DEAL         = 1003              //发牌阶段
var GS_SETTLEMENT   = 1004              //结算阶段
var GS_ROB_BANKER   = 1005              //抢庄阶段

//游戏模式
var MODE_GAME_NORMAL = 1              //常规模式
var MODE_GAME_BULL   = 3              //斗公牛模式
var MODE_GAME_SHIP   = 4              //开船模式
//定庄模式
var MODE_BANKER_ROB   = 1              //随机抢庄
var MODE_BANKER_HOST  = 2              //房主做庄
var MODE_BANKER_ORDER = 3              //轮庄
var MODE_BANKER_NONE  = 4              //无定庄模式
//消耗模式
var MODE_DIAMOND_HOST = 1              //房主扣钻
var MODE_DIAMOND_EVERY = 2             //每人扣钻
var MODE_DIAMOND_WIN = 3               //大赢家扣钻
//创建房间
module.exports.createRoom = function(roomId,channelService,playerNumber,gameBegincb,gameOvercb) {
  console.log("createRoom"+roomId)
  var roomBeginCB = gameBegincb
  var roomCallBack = gameOvercb
  var room = {}
  room.roomId = roomId
  room.roomType = "niuniu"
  room.channel = channelService.getChannel(roomId,true)
  room.isRecord = true
  room.handle = {} //玩家操作
  room.halfwayEnter = true             //允许中途加入
  room.agencyId = 0                    //代开房玩家ID
  room.beginTime = (new Date()).valueOf()
  room.MatchStream = {}
  room.basicType = 0
  //房间初始化
  var local = {}                       //私有方法
  var player = {}                      //玩家属性
  var readyCount = 0                   //游戏准备人数
  var gameState = GS_FREE              //游戏状态
  var banker = -1                      //庄家椅子号
  var oldBanker = banker               //上一局庄家
  var roomHost = -1                    //房主椅子号
  var timer                            //定时器句柄
  var bankerTime = 0                   //连庄次数
  room.GAME_PLAYER = playerNumber      //游戏人数
  var GAME_PLAYER = playerNumber
  //游戏属性
  
  var cards = {}                       //牌组
  var cardCount = 0                    //卡牌剩余数量
  for(var i = 1;i <= 13;i++){
    for(var j = 0;j < 4;j++){
      cards[cardCount++] = {num : i,type : j}
    }
  }
  //牌型历史
  var cardHistory = {}
  for(var i = 0;i < GAME_PLAYER;i++){
    cardHistory[i] = []
  }  
  //下注信息
  
  var betAmount = 0
  //下注上限
  var betType = {
    "0" : {"1" : 1,"2" : 2,"3" : 3,"4" : 5},
    "1" : {"1" : 1,"2" : 5,"3" : 10,"4" : 20}
  }
  //斗公牛模式积分池
  var bonusPool = 40
  var robState,betList
  local.newRoom = function(uid,sid,param,cb) {
    log("newRoom"+uid)
      //无效条件判断
    if(!param.gameMode || typeof(param.gameMode) !== "number" || 
      !(param.gameMode == 1 || param.gameMode == 3 || param.gameMode == 4)){
      log("newRoom error   param.gameMode : "+param.gameMode)
      cb(false)
      return
    }
    if(!param.consumeMode || typeof(param.consumeMode) !== "number" || param.consumeMode > 3 || param.consumeMode < 0){
      log("newRoom error   param.consumeMode : "+param.consumeMode)
      cb(false)
      return
    }
    if(!param.bankerMode || typeof(param.bankerMode) !== "number" || 
      (param.bankerMode != 1 && param.bankerMode != 2 && param.bankerMode != 3 && param.bankerMode != 5)){
      log("newRoom error   param.bankerMode : "+param.bankerMode)
      cb(false)
      return
    }       
    if(!param.gameNumber || typeof(param.gameNumber) !== "number" || (param.gameNumber != 10 && param.gameNumber != 20)){
      log("newRoom error   param.gameNumber : "+param.gameNumber)
      cb(false)
      return
    }    
    if(!param.cardMode || typeof(param.cardMode) !== "number" || param.cardMode > 2 || param.cardMode < 0){
      log("newRoom error   param.cardMode : "+param.cardMode)
      cb(false)
      return
    } 
    if(typeof(param.basicType) !== "number" || !betType[param.basicType]){
          param.basicType = 1
    }    
    if(typeof(param.isWait) !== "boolean"){
        param.isWait = true
    }
    room.basicType = param.basicType
    frame.start(param.isWait)    
    if(param.halfwayEnter === false){
      room.halfwayEnter = false
    }
    //房间初始化
    local.init()

    room.state = false
    room.playerCount  = 0            //房间内玩家人数
    readyCount = 0                   //游戏准备人数
    gameState = GS_FREE              //游戏状态
    room.chairMap = {}               //玩家UID与椅子号映射表
    banker = -1                      //庄家椅子号
    roomHost = 0                     //房主椅子号
    room.runCount = 0                //当前游戏局数
    room.gameMode = param.gameMode                     //游戏模式
    room.bankerMode = param.bankerMode                 //定庄模式
    room.gameNumber = param.gameNumber                 //游戏局数
    room.maxGameNumber = param.gameNumber              //游戏最大局数
    room.consumeMode = param.consumeMode               //消耗模式
    room.cardMode = param.cardMode                     //明牌模式
    room.needDiamond = Math.ceil(room.gameNumber / 10)  //本局每人消耗钻石
    if(room.GAME_PLAYER == 9){
      room.needDiamond = room.needDiamond * 2
    }    
    if(room.gameMode == MODE_GAME_SHIP || room.gameMode == MODE_GAME_BULL){
      room.bankerMode = MODE_BANKER_NONE
    }
    if(room.gameMode == MODE_GAME_BULL){
      banker = roomHost
    }
    if(room.gameMode == conf.MODE_GAME_NORMAL){
      if(room.bankerMode == conf.MODE_BANKER_HOST || room.bankerMode == conf.MODE_BANKER_NIUNIU){
        banker = roomHost
      }
    }   
    cb(true)
  }
  //代开房间
  room.handle.agency = function(uid,sid,param,cb) {
    local.newRoom(uid,sid,param,function(flag) {
        if(flag){
          room.needDiamond = 0
          room.agencyId = uid
          roomHost = -1
        }
        cb(flag)
    })
  }
  //创建房间
  room.handle.newRoom = function(uid,sid,param,cb) {
    local.newRoom(uid,sid,param,function(flag) {
        if(flag){
          room.handle.join(uid,sid,{ip : param.ip, playerInfo : param.playerInfo},cb)
        }else{
          cb(false)
        }
    })
  }
  //玩家加入
  room.handle.join = function(uid,sid,param,cb) {
    log("serverId"+sid)
    //房间未创建不可加入
    if(room.state == true){
      cb(false)
      return
    }
    //是否允许中途加入
    if(room.halfwayEnter == false && room.isBegin()){
      cb(false,tips.CANT_HALF_JOIN)
      return
    }
    //不可重复加入
    for(var i = 0;i < GAME_PLAYER;i++){
        if(player[i] && player[i].uid === uid){
          cb(false)
          return
        }
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
      cb(false,tips.ROOM_FULL)
      return
    }
    //初始化玩家属性
    room.chairMap[uid] = chair
    player[chair].isActive = true
    player[chair].isReady = false
    player[chair].isOnline = true
    player[chair].uid = uid
    player[chair].ip = param.ip
    player[chair].playerInfo = param.playerInfo
    //console.log(player[chair])
    //玩家数量增加
    room.playerCount++

    var notify = {
      cmd: "userJoin",
      uid: uid,
      chair : chair,
      player : player[chair]
    }
    //console.log(notify)
    local.sendAll(notify)
    var newPlayer = deepCopy(player)
    //deal阶段之前不返回牌
    if(gameState < conf.GS_DEAL){
      for(var i = 0; i < GAME_PLAYER;i++){
          delete newPlayer[i].handCard
      }
    }
    //console.log("param.maxGameNumber : "+param.maxGameNumber)
    //console.log("room.gameNumber : "+room.gameNumber)
    if(!room.channel.getMember(uid)){
      room.channel.add(uid,sid)
    }

    notify = {
      cmd : "roomPlayer",
      player:newPlayer,
      gameMode : room.gameMode,
      maxGameNumber : room.maxGameNumber,
      gameNumber : room.maxGameNumber - room.gameNumber,
      consumeMode : room.consumeMode,
      bankerMode : room.bankerMode,
      cardMode : room.cardMode,
      roomId : room.roomId,
      TID_ROB_TIME : conf.TID_ROB_TIME,
      TID_BETTING : conf.TID_BETTING,
      TID_SETTLEMENT : conf.TID_SETTLEMENT,
      state : gameState,
      roomType : room.roomType,
      bankerTime : bankerTime,
      betList : betList,
      bonusPool : bonusPool,
      basicType : room.basicType,
      playerNumber : GAME_PLAYER
    }
    //console.log(notify)
    local.sendUid(uid,notify)
    //console.log(room.channel)
    cb(true)
  }

  //玩家重连
  room.reconnection = function(uid,sid,param,cb) {
    //console.log("uid : "+uid + "  reconnection")
    if(room.chairMap[uid] !== undefined){
      var chair = room.chairMap[uid]
      player[chair].isOnline = true
      player[chair].uid = uid
      var notify = {
        cmd: "userReconnection",
        uid: uid,
        chair : chair
      }
      local.sendAll(notify)
      if(!room.channel.getMember(uid)){
        room.channel.add(uid,sid)
      }
      var newPlayer = deepCopy(player)
      //deal阶段之前不返回牌
      if(gameState < conf.GS_DEAL){
        for(var i = 0; i < GAME_PLAYER;i++){
            delete newPlayer[i].handCard
        }
        if(room.cardMode == conf.MODE_CARD_SHOW){
          newPlayer[chair].handCard = deepCopy(player[chair].handCard)
          delete newPlayer[chair].handCard[4]
        }
      }
      notify = {
        roomInfo : {
          player : newPlayer,
          gameMode : room.gameMode,
          maxGameNumber : room.maxGameNumber,
          gameNumber : room.maxGameNumber - room.gameNumber,
          consumeMode : room.consumeMode,
          bankerMode : room.bankerMode,
          cardMode : room.cardMode,
          roomId : room.roomId,
          TID_ROB_TIME : conf.TID_ROB_TIME, 
          TID_BETTING : conf.TID_BETTING,
          TID_SETTLEMENT : conf.TID_SETTLEMENT,
          roomType : room.roomType,
          bankerTime : bankerTime,
          bonusPool : bonusPool,
          basicType : room.basicType,
          playerNumber : GAME_PLAYER
        },
        betList : betList,
        state : gameState,
        bonusPool : bonusPool,
        surplusGameNumber : room.maxGameNumber - room.gameNumber,
        freeState : param
      }
    cb(notify)
    }else{
      cb(false)
    }
  }
  //玩家离线
  room.leave = function(uid) {
    //判断是否在椅子上
    // console.log("leave11111 : "+room.chairMap[uid])
    var chair = room.chairMap[uid]
    if(chair === undefined){
      return
    }
    // console.log(room.channel)
    // console.log("leave222222")
    if(player[chair].isOnline == true){
      player[chair].isOnline = false
      var tsid =  room.channel.getMember(uid)['sid']
      if(tsid){
        room.channel.leave(uid,tsid)
      }
      // console.log(room.channel)
      var notify = {
        cmd: "userDisconne",
        uid: uid,
        chair : chair
      }
      local.sendAll(notify)    
      if(room.gameMode == conf.MODE_GAME_BULL){
        if(banker == chair){
          return
        }
      }else if(room.gameMode == conf.MODE_GAME_NORMAL || room.gameMode == conf.MODE_GAME_CRAZE){
        if((room.bankerMode == conf.MODE_BANKER_HOST || room.bankerMode == conf.MODE_BANKER_NIUNIU)&& banker == chair){
          return
        }
      }
      frame.disconnect(chair,player,gameState,local,local.chooseBanker)
    }
  }
  //玩家准备
  room.handle.ready = function(uid,sid,param,cb) {
      var chair = room.chairMap[uid]
      if(chair === undefined){
        cb(false)
        return
      }
      var tmpBanker = -1
      if(room.gameMode == conf.MODE_GAME_BULL){
          tmpBanker = banker
      }
      if(room.gameMode == conf.MODE_GAME_NORMAL){
        if(room.bankerMode == conf.MODE_BANKER_HOST || room.bankerMode == conf.MODE_BANKER_NIUNIU){
          tmpBanker = banker
        }
      }      
      frame.ready(uid,chair,player,gameState,local, local.chooseBanker,tmpBanker,cb)
  }
  //玩家下庄
  room.handle.downBanker = function(uid,sid,param,cb) {
    if(gameState !== GS_FREE){
      cb(false)
      return
    }
    if(room.gameMode !== conf.MODE_GAME_BULL){
      cb(false)
      return      
    }
    var chair = room.chairMap[uid]
    if(chair == undefined){
      cb(false)
      return
    } 
    if(chair !== banker){
      cb(false)
      return      
    }
    //连庄三局才能换庄
    if(bankerTime < 3){
      cb(false)
      return    
    }
    player[banker].score += bonusPool
    var tmpOldBanker = banker
    //换庄
    do{
        banker = (banker + 1)%GAME_PLAYER
    }while(player[banker].isActive == false)
    bonusPool = room.playerCount * 8
    player[banker].score -= bonusPool
    bankerTime = 0
    log("banker change : "+banker)      
    var notify = {
      "cmd" : "downBanker",
      "chair" : chair,
      "banker" : banker,
      "bonusPool" : bonusPool,
      "bankerScore" : player[banker].score,
      "oldBankerScore" : player[tmpOldBanker].score
    }
    local.sendAll(notify)
  }
  //玩家抢庄
  room.handle.robBanker = function(uid,sid,param,cb) {
    if(gameState !== GS_ROB_BANKER){
      cb(false)
      return
    }
    //判断是否在椅子上
    var chair = room.chairMap[uid]
    if(chair == undefined){
      cb(false)
      return
    }    
    log("robBanker")
    //判断是否已抢庄
    if(robState[chair] != 0){
      cb(false)
      return
    }
    //记录抢庄
    if(param && param.flag == true){
      robState[chair] = 1
    }else{
      robState[chair] = 2
    }
    var notify = {
      "cmd" : "robBanker",
      "chair" : chair,
      "flag" : robState[chair]
    }
    local.sendAll(notify)
    cb(true)
    //判断所有人都已操作进入下个阶段
    var flag = true
    for(var index in robState){
      if(robState.hasOwnProperty(index)){
        if(player[index].isActive){
          if(robState[index] == 0){
            flag = false
          }
        }
      }
    }
    if(flag){
      clearTimeout(timer)
      local.endRob()
    }
  }
  //发送聊天
  room.handle.say = function(uid,sid,param,cb) {
    //判断是否在椅子上
    var chair = room.chairMap[uid]
    if(chair == undefined){
      cb(false)
      return
    }    
    log("sendMsg")
    var notify = {
      cmd : "sayMsg",
      uid : uid,
      chair : chair,
      msg : param.msg
    }
    local.sendAll(notify)
    cb(true)
  }
  //下注通知
  local.betMessege = function(chair,bet) {
    var notify = {
      "cmd" : "bet",
      "chair" : chair,
      "bet" : bet,
      "betAmount" : betAmount
    }
    local.sendAll(notify)     
  }
  //玩家下注
  room.handle.bet = function(uid,sid,param,cb){
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
    //不在游戏中不能下注
    if(!player[chair].isReady){
      cb(false)
      return
    }    
    //庄家不能下注
    if(chair == banker){
      cb(false)
      return
    }
    //斗公牛模式使用特殊下注限制
    if(room.gameMode == MODE_GAME_BULL){
      var tmpMinbet = Math.floor(bonusPool / room.playerCount / 5)
      if(tmpMinbet > 40){
        tmpMinbet = 40
      }
      if(param.bet && typeof(param.bet) == "number"
        && (param.bet >= tmpMinbet) && param.bet > 0
        && (param.bet + betList[chair]) <= 40
        && (param.bet + betList[chair]) <= Math.floor(bonusPool / (room.playerCount - 1))
        && (param.bet + betAmount) <= bonusPool ){
        betList[chair] += param.bet
        betAmount += param.bet
        local.betMessege(chair,param.bet)
      }else{
        cb(false)
        return
      }
    }else{
      //其他模式
      if(param.bet && typeof(param.bet) == "number"
        && param.bet > 0 && betList[chair] == 0 && betType[room.basicType][param.bet]){
        var tmpbet = betType[room.basicType][param.bet]
        betList[chair] += tmpbet
        betAmount += tmpbet
        local.betMessege(chair,tmpbet)
      }else{
        cb(false)
        return
      }      
    }
    cb(true)
    //判断所有人都下注进入发牌阶段
    var flag = true
    for(var index in betList){
      if(betList.hasOwnProperty(index)){
        if(player[index].isActive && index != banker && player[index].isReady){
            if(betList[index] === 0){
              flag = false
            }
        }
      }
    }
    if(flag){
      //取消倒计时  进入发牌
      clearTimeout(timer)
      local.deal()
    }
  }
  room.handle.showCard = function(uid,sid,param,cb) {
    //游戏状态为GS_DEAL
    if(gameState !== GS_DEAL){
      cb(false)
      return
    }
    //判断是否在椅子上
    var chair = room.chairMap[uid]
    if(chair === undefined){
      cb(false)
      return
    }
    //已经开牌则不能再开牌
    if(player[chair].isShowCard == true){
      cb(false)
      return
    }
    player[chair].isShowCard = true
    
    var notify = {
      "cmd": "showCard",
      "chair" : chair
    }
    local.sendAll(notify)
    //所有参与游戏的玩家都开牌则在三秒后进入结算
    var flag = true
    for(var i = 0; i < GAME_PLAYER;i++){
      if(player[i].isReady == true && player[i].isShowCard == false){
        flag = false
      }
    }

    if(flag){
      clearTimeout(timer)
      local.settlement()
    }
    cb(true)
  }
  //定庄阶段  有抢庄则进入抢庄
  local.chooseBanker = function() {
    gameState = GS_ROB_BANKER
    switch(room.bankerMode){
      case MODE_BANKER_ROB :
        //初始化抢庄状态为false
        for(var i = 0; i < GAME_PLAYER;i++){
          robState[i] = 0
        }
        //抢庄
        var notify = {
          "cmd" : "beginRob"
        }
        local.sendAll(notify)
        timer = setTimeout(local.endRob,TID_ROB_TIME)    
        break
      case MODE_BANKER_ORDER :
        //轮庄
        do{
            banker = (banker + 1)%GAME_PLAYER
        }while(player[banker].isActive == false || player[banker].isReady == false)

        local.gameBegin()
        break
      case MODE_BANKER_HOST :
        //房主当庄
        banker = roomHost
        if(roomHost === -1){
          banker = 0
        }
        local.gameBegin()
        break
      default:

        local.gameBegin()
        break
    }
  }

  //结束抢庄
  local.endRob = function() {
    //统计抢庄人数
    var num = 0
    var robList = {}
    for(var i = 0; i < GAME_PLAYER;i++){
      if(robState[i] == 1){
        robList[num++] = i
      }
    }
    console.log("endRob num : "+num)
    //无人抢庄将所有参与游戏的玩家加入抢庄列表
    if(num == 0){
      for(var i = 0; i < GAME_PLAYER;i++){
        //console.log("i : "+i +"player[i].isActive : "+player[i].isActive+" player[i].isReady : "+ player[i].isReady)
        if(player[i].isActive && player[i].isReady){
          robList[num++] = i
        }
      }
    }
    //console.log("num : "+num)
    //随机出一个庄家
    var index = Math.floor(Math.random() * num)%num
    //console.log("index : "+index)
    num = robList[index]
    

    banker = num

    local.gameBegin()
  }

  //游戏开始
  local.gameBegin = function() {
    if(room.gameNumber > 0){
      log("gameBegin")   
      gameState = conf.GS_GAMEING    
      //第一次开始游戏调用游戏开始回调
      if(room.gameNumber === room.maxGameNumber){
        roomBeginCB(room.roomId,room.agencyId)
      }      
      room.gameNumber--
      betAmount = 0
      //重置下注信息
      for(var i = 0;i < GAME_PLAYER;i++){
            betList[i] = 0;
            player[i].isShowCard = false
      }
      if(banker !== -1){
        //重置庄家信息
        for(var i = 0;i < GAME_PLAYER;i++){
            betList[i] = 0;
            player[i].isBanker = false
        }
        //console.log("banker : "+banker)
        player[banker].isBanker = true    
        player[banker].bankerCount++
        //广播庄家信息
        var notify = {
          "cmd" : "banker",
          chair : banker
        }
        local.sendAll(notify)   
      }
      //斗牛模式更新积分池
      if(room.gameMode == MODE_GAME_BULL){

        var notify = {
          "cmd" : "bonusPool",
          "bonusPool" : bonusPool,
          "bankerScore" : player[banker].score,
          "change" : oldBanker !== banker
        }
        if(bonusPool == 0 && room.runCount == 0){
          bonusPool = room.playerCount * 8
          player[banker].score -= bonusPool
          notify.change = true
          notify.bonusPool = bonusPool
          notify.bankerScore = player[banker].score
        }else{
          //积分池小于人数则换庄
          if(bonusPool < room.playerCount){
            player[banker].isBanker = false
            player[banker].score += bonusPool
            local.updatePlayerScore(banker)
            do{
                banker = (banker + 1)%GAME_PLAYER
            }while(player[banker].isActive == false || player[banker].isReady == false || player[banker].isOnline == false)
            bonusPool = room.playerCount * 8
            player[banker].score -= bonusPool
            player[banker].isBanker = true
            bankerTime = 0
            log("banker change : "+banker)
            notify.change = true
            notify.bonusPool = bonusPool
            notify.bankerScore = player[banker].score
          } 
        }
        local.sendAll(notify)          
      }
      var index = 0
      //增加大牌概率，当牌型权重较低时重新洗牌
      var randTimes = 0
      do{
        randTimes++
        //洗牌
        for(var i = 0;i < cardCount;i++){
          var tmpIndex = Math.floor(Math.random() * (cardCount - 0.000001))
          var tmpCard = cards[i]
          cards[i] = cards[tmpIndex]
          cards[tmpIndex] = tmpCard
        }
        //发牌
        var result = {}
        index = 0
        var tmpAllCount = 0     //总玩家数
        var tmpTypeCount = 0    //牌型权重 
        
        for(var i = 0;i < GAME_PLAYER;i++){
            if(player[i].isActive && player[i].isReady){
              for(var j = 0;j < 5;j++){
                player[i].handCard[j] = cards[index++];
              }
              tmpAllCount++
              result[i] = logic.getType(player[i].handCard)
              //console.log("type : "+result[i].type)
              tmpTypeCount += conf.typeWeight[result[i].type]
            }
        }
        var dealFlag = false
        //判断是否重新洗牌
        if((tmpTypeCount / tmpAllCount) < conf.TYPE_WEIGHT){
            dealFlag = true
        }
      }while(dealFlag && randTimes < conf.ROUND_TIMES)

      //找出剩余牌
      var tmpCards = {}
      var tmpCardCount = 0
      for(var i = index;i < cardCount;i++){
        tmpCards[tmpCardCount++] = deepCopy(cards[i])
      }

      //执行控制   
      //先计算每个人的运气值   -1 到 1之间     
      var luckyValue = {}
      var randomMaxScore = 500 + Math.floor(Math.random() * 300)
      var randomMinScore = 400 + Math.floor(Math.random() * 200)
      for(var i = 0;i < GAME_PLAYER;i++){
          if(player[i].isActive && player[i].isReady){
            if(player[i].score > 100){
                luckyValue[i] = player[i].score / randomMaxScore
            }else if(player[i].score < -100){
                luckyValue[i] = player[i].score / randomMinScore
            }else{
              continue
            }
            if(luckyValue[i] > 1){
              luckyValue[i] = 1
            }else if(luckyValue[i] < -1){
              luckyValue[i] = -1
            }
            luckyValue[i] = luckyValue[i] * 0.6
          }
      }
      //斗公牛模式庄家积分应加上积分池
      if(room.gameMode == MODE_GAME_BULL){
          var tmpFlag = true
          if(player[banker].score > 100){
              luckyValue[banker] = player[banker].score / randomMaxScore
          }else if(player[banker].score < -100){
              luckyValue[banker] = player[banker].score / randomMinScore
          }else{
            tmpFlag = false
          }
          if(tmpFlag){
            if(luckyValue[banker] > 1){
              luckyValue[banker] = 1
            }else if(luckyValue[banker] < -1){
              luckyValue[banker] = -1
            }
            luckyValue[banker] = luckyValue[banker] * 0.6             
          }
      }
      //代理增加运气值   值为负则好牌概率高
      for(var i = 0;i < GAME_PLAYER;i++){
        if(player[i].isReady &&  parseInt(player[i].playerInfo.limits) >= 1){
            if(!luckyValue[i]){
              luckyValue[i] = 0
            }
            luckyValue[i] -= 0.05
        }
      }
      //特殊控制
      for(var i = 0;i < GAME_PLAYER;i++){
        if(player[i].isActive && player[i].isReady){
          if(player[i].playerInfo["contorl"] && player[i].playerInfo["contorl"] != 0){
              if(!luckyValue[i]){
                luckyValue[i] = 0
              }
              var contorlValue = parseFloat(player[i].playerInfo["contorl"])
              luckyValue[i] -= contorlValue
          }      
        }
      }
      //运气值低的先执行控制 
      for(var i = 0;i < GAME_PLAYER;i++){
        if(luckyValue[i]){
          if(player[i].isActive && player[i].isReady){
              if(luckyValue[i] < 0){
                if(Math.random() < -luckyValue[i]){
                  //换好牌
                    console.log("chair : "+i+"   换好牌")
                    logic.changeHandCard(player[i].handCard,tmpCards,tmpCardCount,true)
                }
              }else if(luckyValue[i] > 0){
                if(Math.random() < luckyValue[i]){
                  //换差牌
                    logic.changeHandCard(player[i].handCard,tmpCards,tmpCardCount,false)
                }
              }
          }          
        }
      }

      //明牌模式发牌
      if(room.cardMode == conf.MODE_CARD_SHOW){
        var notify = {
          "cmd" : "MingCard"
        }
        for(var i = 0;i < GAME_PLAYER;i++){
          if(player[i].isActive && player[i].isReady){
            var tmpCards = {}
            for(var j = 0;j < MING_CARD_NUM;j++){
                tmpCards[j] = player[i].handCard[j];
            }
            notify.Cards = tmpCards
            local.sendUid(player[i].uid,notify)    
          }
        }
      }
      //进入下注
      local.betting()      
    }    
  }
  //下注阶段
  local.betting = function() {
    log("betting")
    //状态改变
    gameState = GS_BETTING
    //通知客户端
    var notify = {
      cmd : "beginBetting",
      banker : banker
    }
    local.sendAll(notify)
    //定时器启动下一阶段
    timer = setTimeout(local.deal,TID_BETTING)      
    
  }
  //发牌阶段  等待摊牌后进入结算
  local.deal = function(){
      log("deal")
      gameState = GS_DEAL
      //若玩家未下注默认下一分
      //默认底分
      for(var i = 0; i < GAME_PLAYER;i++){
          if(player[i].isReady && player[i].isActive && i != banker && betList[i] == 0){
            var tmpBet = 1
            if(room.gameMode === conf.MODE_GAME_BULL){
              tmpBet = Math.floor(bonusPool / room.playerCount / 5)
              if(tmpBet === 0){
                tmpBet = 1
              }
              if(tmpBet > 40){
                tmpBet = 40
              }
            }
            betList[i] = tmpBet
            betAmount += tmpBet
            local.betMessege(i,tmpBet)  
          }
      }  
      var tmpCards = {}
      //发牌
      for(var i = 0;i < GAME_PLAYER;i++){
          if(player[i].isReady){
            tmpCards[i]= player[i].handCard
          }
      }
      var notify = {
        "cmd" : "deal",
        "handCards" : tmpCards
      }
      for(var i = 0;i < GAME_PLAYER;i++){
        if(player[i].isActive){
          local.sendUid(player[i].uid,notify)
        }
      }
      
      timer = setTimeout(function(){
        gameState = GS_FREE
        local.settlement()
      },TID_SETTLEMENT)
  }

  //结算阶段
  local.settlement = function(){
      clearTimeout(timer)
      gameState = GS_FREE
      log("settlement")
      room.runCount++
      oldBanker = banker
      //计算牌型
      var result = {}
      for(var i = 0;i < GAME_PLAYER;i++){
          if(player[i].isReady){
            result[i] = logic.getType(player[i].handCard); 
            //player[i].cardsList[room.runCount] = result[i]
            cardHistory[i].push(result[i])   
          }
      }
      var trueResult = deepCopy(result)
      var bankerResult = result[banker]
      //结算分
      var curScores = new Array(GAME_PLAYER)
      for(var i = 0;i < GAME_PLAYER;i++){
        curScores[i] = 0
      }
      var bankerScoreChange = 0
      
      switch(room.gameMode){
        case conf.MODE_GAME_NORMAL : 
        case conf.MODE_GAME_CRAZE :
          //常规模式结算
          for(var i = 0;i < GAME_PLAYER;i++){
            if(player[i].isActive && player[i].isReady){
                if(i === banker || player[i].isReady != true) continue
                //比较大小
                if(logic.compare(result[i],result[banker])){
                    //闲家赢
                    var award = result[i].award
                    curScores[i] += betList[i] * award
                    curScores[banker] -= betList[i] * award
                }else{
                    //庄家赢
                    var award = result[banker].award
                    curScores[i] -= betList[i] * award
                    curScores[banker] += betList[i] * award
                }              
            }
          }
          //牛牛坐庄模式换庄
          if(room.bankerMode == conf.MODE_BANKER_NIUNIU){
            var maxResultFlag = false
            var maxResultIndex = -1
            for(var i = 0;i < GAME_PLAYER;i++){
              if(player[i].isActive && player[i].isReady){
                  if(result[i].type >= 10){
                    if(maxResultFlag == false){
                      maxResultFlag = true
                      maxResultIndex = i
                    }else{
                      if(logic.compare(result[i],result[maxResultIndex])){
                        maxResultIndex = i
                      }
                    }
                  }           
              }
            }
            if(maxResultFlag){
              banker = maxResultIndex
            }else{
              do{
                  banker = (banker + 1)%GAME_PLAYER
              }while(player[banker].isActive == false || player[banker].isReady == false)
            }
          }
          break
        case conf.MODE_GAME_BULL : 
          //斗公牛模式优先结算庄家赢的钱，再按牌型从高到低结算输的钱，直至积分池为空
          //结算庄家赢
            //console.log(betList)
            for(var i = 0;i < GAME_PLAYER;i++){
              if(i === banker || player[i].isReady != true) continue
              if(!logic.compare(result[i],result[banker])){
                  //庄家赢
                  var tmpScore = betList[i] * result[banker].award
                  //console.log("uid : "+player[i].uid+"  chair : "+i+"  lose tmpScore : "+tmpScore)
                  curScores[i] -= tmpScore
                  bankerScoreChange += tmpScore
                  bonusPool += tmpScore
              }
            }
            //console.log("bonusPool : "+bonusPool)
            //结算庄家输
            //牌型按大小排序
            var tmpUidList = new Array(GAME_PLAYER)
            for(var i = 0;i < GAME_PLAYER;i++){ tmpUidList[i] = i }
            //console.log(result)
            for(var i = 0;i < GAME_PLAYER - 1;i++){
              for(var j = 0;j < GAME_PLAYER - 1 - i;j++){
                if(!player[tmpUidList[j + 1]].isReady){ continue }
                if(player[tmpUidList[j]].isReady != true || !logic.compare(result[j],result[j + 1])){
                   var tmpResult = result[j + 1]
                   result[j + 1] = result[j]
                   result[j] = tmpResult
                   var tmpUid = tmpUidList[j + 1]
                   tmpUidList[j + 1] = tmpUidList[j]
                   tmpUidList[j] = tmpUid
                }
              }
            }
            //console.log(trueResult)
            //console.log(tmpUidList)
            //优先赔付牌型大的闲家
            for(var i = 0;i < GAME_PLAYER;i++){
              if(tmpUidList[i] === banker || player[tmpUidList[i]].isReady != true) continue
              if(logic.compare(result[i],bankerResult)){
                  //闲家赢
                  var tmpScore = betList[tmpUidList[i]] * result[i].award
                  if(tmpScore > bonusPool){
                      tmpScore = bonusPool
                  }
                  //console.log("uid : "+player[tmpUidList[i]].uid+"  chair : "+tmpUidList[i]+"  win tmpScore : "+tmpScore)
                  curScores[tmpUidList[i]] += tmpScore
                  bankerScoreChange -= tmpScore
                  bonusPool -= tmpScore
              }
            } 
            bankerTime++
            //斗牛模式更新积分池
            if(room.gameMode == MODE_GAME_BULL){
              var notify = {
                "cmd" : "bonusPool",
                "bonusPool" : bonusPool,
                "bankerScore" : player[banker].score,
                "change" : false
              }
              local.sendAll(notify)          
            }
            //console.log("bonusPool : "+bonusPool)           
          break
        case MODE_GAME_SHIP : 
          //开船模式先收集所有人的下注，再按从大到小赔付
          //先减去下注额
          var tmpAllBet = 0
          //console.log(betList)
          for(var i = 0;i < GAME_PLAYER;i++){
            if(betList[i] && typeof(betList[i]) == "number" && player[i].isReady){
              curScores[i] -= betList[i]
              tmpAllBet += betList[i]
            }
          }
          //排序
          var tmpUidList = new Array(GAME_PLAYER)
          for(var i = 0;i < GAME_PLAYER;i++){ tmpUidList[i] = i }

          //console.log(result)
          for(var i = 0;i < GAME_PLAYER - 1;i++){
            for(var j = 0;j < GAME_PLAYER - 1 - i;j++){
              if(player[tmpUidList[j + 1]].isReady != true){ 
                continue 
              }
              if(player[tmpUidList[j]].isReady != true || !logic.compare(result[j],result[j + 1])){
                  var tmpUid = tmpUidList[j + 1]
                  tmpUidList[j + 1] = tmpUidList[j]
                  tmpUidList[j] = tmpUid
                  var tmpResult = result[j + 1]
                  result[j + 1] = result[j]
                  result[j] = tmpResult
              }
            }
          }
          //console.log(result)
          log("curScores==================")
          log(curScores)
          //按牌型赔付
          for(var i = 0;i < GAME_PLAYER;i++){
            if(betList[tmpUidList[i]] && typeof(betList[tmpUidList[i]]) == "number" && player[tmpUidList[i]].isReady){
              var tmpScore = betList[tmpUidList[i]] * result[i].award + betList[tmpUidList[i]]
              if(tmpScore > tmpAllBet){
                tmpScore = tmpAllBet
              }
              log("award : "+tmpScore)
              tmpAllBet -= tmpScore
              curScores[tmpUidList[i]] += tmpScore
            }
          }  

          break 
      }
      //积分改变
      for(var i = 0;i < GAME_PLAYER;i++){
          if(curScores[i] != 0){
            local.changeScore(i,curScores[i])
          }
      }
      //重置下注信息
      for(var i = 0;i < GAME_PLAYER;i++){
          betList[i] = 0;
          player[i].isShowCard = false
      }
      if(room.gameMode === conf.MODE_GAME_BULL){
        notify.bankerTime = bankerTime
        curScores[oldBanker] = bankerScoreChange
      }
      var realScores = {}
      //返回玩家实际分数
      for(var i = 0;i < GAME_PLAYER;i++){
          realScores[i] = player[i].score
      }
      //发送当局结算消息
      var notify = {
        "cmd" : "settlement",
        "result" : trueResult,
        "curScores" : curScores,
        "realScores" : realScores,
        "player" : player,
        "bankerTime" : bankerTime
      }
      local.sendAll(notify)
      //记录牌局流水
      var stream = {}
      for(var i = 0; i < GAME_PLAYER;i++){
        if(player[i].isActive && player[i].isReady){
            stream[i] = {
              "uid" : player[i].uid,
              "result" : trueResult[i],
              "handCard" : deepCopy(player[i].handCard),
              "changeScore" : curScores[i]
            }
        }
      }
      room.MatchStream[room.runCount] = stream
      //房间重置
      for(var i = 0;i < GAME_PLAYER; i++){
          player[i].isReady = false;
          betList[i] = 0;
          player[i].isBanker = false          
      }    
      readyCount = 0
      if(room.gameNumber <= 0){
          local.gameOver()
      }
  }
  //总结算
  local.gameOver = function(flag) {
    clearTimeout(timer)
    //斗公牛模式庄家积分需加上积分池
    if(room.gameMode === conf.MODE_GAME_BULL){
      player[banker].score += bonusPool
      bonusPool = 0
    }
    //总结算
    room.state = true
    var notify = {
      "cmd" : "gameOver",
      "player" : player,
      "cardHistory" : cardHistory
    }

    local.sendAll(notify)
    room.endTime = (new Date()).valueOf()
    var tmpscores = {}
    for(var i = 0; i < GAME_PLAYER;i++){
      if(player[i].isActive){
        tmpscores[player[i].uid] = player[i].score
      }
    }
    room.scores = tmpscores
    //结束游戏
    roomCallBack(room.roomId,player,flag,local.init)
  }
  //积分改变
  local.changeScore = function(chair,score) {
        player[chair].score += score;
        // var notify = {
        //   "cmd" : "changeScore",
        //   "chair" : chair,
        //   "difference" : score,
        //   "score" : player[chair].score
        // }      
        // local.sendAll(notify)        
  }

  //广播消息
  local.sendAll = function(notify) {
    room.channel.pushMessage('onMessage',notify)
  }

  //通过uid 单播消息
  local.sendUid = function(uid,notify) {
    if(room.channel.getMember(uid)){
        var tsid =  room.channel.getMember(uid)['sid']
        channelService.pushMessageByUids('onMessage', notify, [{
          uid: uid,
          sid: tsid
        }]);  
      }
  }

  //更新单个玩家积分
  local.updatePlayerScore = function(chair) {
    var notify = {
      "cmd" : "updatePlayerScore",
      "chair" : chair,
      "score" : player[chair].score
    }
    local.sendAll(notify)
  }

  //房间初始化
  local.init = function() {
    //console.log("enter init=====================================")
    room.gameMode = 0                    //游戏模式
    room.gameNumber = 0                  //游戏局数
    room.maxGameNumber = 0               //游戏最大局数
    room.consumeMode = 0                 //消耗模式
    room.bankerMode  = 0                 //定庄模式
    room.needDiamond = 0                 //钻石基数
    //房间属性
    room.state = true                    //房间状态，true为可创建
    room.playerCount  = 0                //房间内玩家人数
    readyCount = 0                   //游戏准备人数
    gameState = GS_FREE              //游戏状态
    room.chairMap = {}                   //玩家UID与椅子号映射表
    banker = -1                      //庄家椅子号
    roomHost = -1                    //房主椅子号
    timer = undefined                //定时器句柄
    //游戏属性
    robState = new Array(GAME_PLAYER) //抢庄状态记录
    cards = {}                       //牌组
    cardCount = 0                    //卡牌剩余数量
    for(var i = 1;i <= 13;i++){
      for(var j = 0;j < 4;j++){
        cards[cardCount++] = {num : i,type : j}
      }
    }
    //console.log("enter init=====================================111111111111111")
    //下注信息
    betList = new Array(GAME_PLAYER)
    betAmount = 0
    //斗公牛模式积分池
    bonusPool = room.playerCount * 8
    //玩家属性
    player = {}
    for(var i = 0;i < GAME_PLAYER;i++){
        local.initChairInfo(i)
    }    
       //console.log("enter init=====================================222")
      //channel清空
      channelService.destroyChannel(roomId)
      room.channel = channelService.getChannel(roomId,true)
      //console.log(room.channel)   
  }
  //初始化椅子信息
  local.initChairInfo = function(chiar) {
      player[chiar] = {}
      player[chiar].chair = chiar             //椅子号
      player[chiar].uid = 0                   //uid
      player[chiar].isActive = false          //当前椅子上是否有人
      player[chiar].isOnline = false          //玩家是否在线
      player[chiar].isReady = false           //准备状态
      player[chiar].isBanker = false          //是否为庄家
      player[chiar].isShowCard = false        //是否开牌
      player[chiar].handCard = new Array(5)   //手牌
      player[chiar].score = 0                 //当前积分
      player[chiar].bankerCount = 0           //坐庄次数
      //player[chiar].cardsList  = {}           //总战绩列表
      player[chiar].ip  = undefined           //玩家ip地址
  }
  //房间是否已开始游戏
  room.isBegin = function() {
    if(room.runCount === 0 && gameState === conf.GS_FREE){
        return false
    }else{
        return true
    }
  }  
  //房间是否空闲
  room.isFree = function() {
    return gameState === conf.GS_FREE
  }
  //获取房间人数
  room.getPlayerCount = function() {
    var count = 0
    for(var i = 0;i < GAME_PLAYER;i++){
      if(player[i].isActive){
        count++
      }
    }
    return count
  }
  //解散游戏
  room.finishGame = function(flag) {
    //游戏一局都没开始则不扣钻石
    if(room.runCount == 0){
      room.needDiamond = 0
      room.isRecord = false
    }
    room.gameNumber = 0
    local.gameOver(flag)
  }
  //用户退出
  room.userQuit = function(uid,cb) {
    //再次确保游戏未开始
    if(room.isBegin()){
      return
    }
    var chair = room.chairMap[uid]
    room.playerCount--
    //房主退出解散房间
    if(chair == roomHost){
        room.finishGame()
    }else{
      //清除座位信息
      local.initChairInfo(chair) 
      var tsid =  room.channel.getMember(uid)['sid']
      if(tsid){
        room.channel.leave(uid,tsid)
      }
      delete room.chairMap[uid]
      var notify = {
        cmd: "userQuit",
        uid: uid,
        chair : chair
      }
      local.sendAll(notify)     
      cb()     
    }
  }

  return room 
}


var log = function(str) {
    console.log("LOG NiuNiu : "+str)
}

var copyObj = function(obj) {
  let res = {}
  for (var key in obj) {
    res[key] = obj[key]
  }
  return res
}

var deepCopy = function(source) { 
  var result={}
  for (var key in source) {
        result[key] = typeof source[key]==="object"? deepCopy(source[key]): source[key]
     } 
  return result;
}
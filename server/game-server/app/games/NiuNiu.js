var logic = require("./NiuNiuLogic.js")
var conf = require("../conf/niuniuConf.js").niuConf

//常量定义
var GAME_PLAYER = conf.GAME_PLAYER      //游戏人数
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
module.exports.createRoom = function(roomId,channelService,cb) {
  console.log("createRoom"+roomId)
  var roomCallBack = cb
  var room = {}
  room.roomId = roomId
  room.roomType = "niuniu"
  room.channel = channelService.getChannel(roomId,true)
  room.isRecord = true
  room.handle = {} //玩家操作
  room.halfwayEnter = true             //允许中途加入
  //房间初始化
  var local = {}                       //私有方法
  var player = {}                      //玩家属性
  var readyCount = 0                   //游戏准备人数
  var gameState = GS_FREE              //游戏状态
  var banker = -1                      //庄家椅子号
  var roomHost = -1                    //房主椅子号
  var beginPlayer = {}                 //当局游戏参与玩家
  var timer                            //定时器句柄
  var bankerTime = 0                   //连庄次数
  room.GAME_PLAYER = 6                 //游戏人数
  GAME_PLAYER = 6
  //游戏属性
  
  var cards = {}                       //牌组
  var cardCount = 0                    //卡牌剩余数量
  for(var i = 1;i <= 13;i++){
    for(var j = 0;j < 4;j++){
      cards[cardCount++] = {num : i,type : j}
    }
  }
  //下注信息
  
  var betAmount = 0
  //下注上限
  var maxBet = 0
  //斗公牛模式积分池
  var bonusPool = 40
  var robState,betList
  local.newRoom = function(uid,sid,param,cb) {
    log("newRoom"+uid)
      //无效条件判断
    if(!param.gameMode || typeof(param.gameMode) !== "number" || param.gameMode > 4 || param.gameMode < 0){
      log("newRoom error   param.gameMode : "+param.gameMode)
      cb(false)
      return
    }
    if(!param.consumeMode || typeof(param.consumeMode) !== "number" || param.consumeMode > 3 || param.consumeMode < 0){
      log("newRoom error   param.consumeMode : "+param.consumeMode)
      cb(false)
      return
    }
    if(!param.bankerMode || typeof(param.bankerMode) !== "number" || param.bankerMode > 3 || param.bankerMode < 0){
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
    //设置下注上限
    maxBet = 20
    // if(room.gameMode == MODE_GAME_BULL){
    //   room.bankerMode = MODE_BANKER_NONE
    //   banker = roomHost
    //   maxBet = 10
    // }
    //console.log("room maxGameNumber : "+room.maxGameNumber)
    if(room.gameMode == MODE_GAME_SHIP || room.gameMode == MODE_GAME_BULL){
      room.bankerMode = MODE_BANKER_NONE
    }
    if(room.gameMode == MODE_GAME_BULL){
      banker = roomHost
    }
    cb(true)
  }
  //代开房间
  room.handle.agency = function(uid,sid,param,cb) {
    local.newRoom(uid,sid,param,function(flag) {
        if(flag){
          room.needDiamond = 0
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
        }
        cb(flag)
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
      cb(false)
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
      cb(false)
      return
    }
    //初始化玩家属性
    room.chairMap[uid] = chair
    player[chair].isActive = true
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
    console.log(notify)
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
      betList : betList
    }
    //console.log(notify)
    local.sendUid(uid,notify)
    //console.log(room.channel)
    cb(true)
  }

  //玩家重连
  room.reconnection = function(uid,sid,param,cb) {
    console.log("uid : "+uid + "  reconnection")
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
          gameNumber : room.maxGameNumber,
          consumeMode : room.consumeMode,
          bankerMode : room.bankerMode,
          cardMode : room.cardMode,
          roomId : room.roomId,
          TID_ROB_TIME : conf.TID_ROB_TIME, 
          TID_BETTING : conf.TID_BETTING,
          TID_SETTLEMENT : conf.TID_SETTLEMENT,
          roomType : room.roomType,
          bankerTime : bankerTime
        },
        betList : betList,
        state : gameState,
        bonusPool : bonusPool,
        surplusGameNumber : room.maxGameNumber - room.gameNumber
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
      //playerCount--
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
    }
  }
  //玩家准备
  room.handle.ready = function(uid,sid,param,cb) {
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
      var notify = {
        cmd: "userReady",
        uid: uid,
        chair : chair
      }
      local.sendAll(notify)
      //房间内玩家全部准备且人数大于2时开始游戏
      //console.log("readyCount : "+readyCount) 
      //console.log("room.playerCount : "+room.playerCount)
      if(readyCount == room.playerCount && room.playerCount >= 2){
          //进入定庄阶段
          console.log("beginGame")
          //发送游戏开始消息
          notify = {
            "cmd" : "gameStart"
          }
          local.sendAll(notify)
          local.chooseBanker()
      }      
    }
    cb(true)
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
    //换庄
    do{
        banker = (banker + 1)%GAME_PLAYER
    }while(player[banker].isActive == false)
    bonusPool = 40
    bankerTime = 0
    log("banker change : "+banker)      
    var notify = {
      "cmd" : "downBanker",
      "chair" : chair,
      "banker" : banker
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
    if(robState[chair] == true){
      cb(false)
      return
    }
    //记录抢庄
    robState[chair] = true
    cb(true)
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
    //庄家不能下注
    if(chair == banker){
      cb(false)
      return
    }
    //斗公牛模式使用特殊下注限制
    if(room.gameMode == MODE_GAME_BULL){
      if(param.bet && typeof(param.bet) == "number" && param.bet > 0 && (param.bet + betList[chair]) <= 30 && (param.bet + betList[chair]) <= Math.floor(bonusPool / (room.playerCount - 1)) && (param.bet + betAmount) <= bonusPool ){
        betList[chair] += param.bet
        betAmount += param.bet 
        local.betMessege(chair,param.bet)     
        cb(true)
        return
      }else{
        cb(false)
      }
    }else{
      //其他模式
      if(param.bet && typeof(param.bet) == "number" 
        && param.bet > 0 && (param.bet + betList[chair]) <= maxBet){
        betList[chair] += param.bet
        betAmount += param.bet
        local.betMessege(chair,param.bet)     
        cb(true)
      }else{
        cb(false)
      }      
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
      if(beginPlayer[i] == true && player[i].isShowCard == false){
        flag = false
      }
    }

    if(flag){
      clearTimeout(timer)
      timer = setTimeout(local.settlement,3000) 
    }

  }
  //定庄阶段  有抢庄则进入抢庄
  local.chooseBanker = function() {
    //记录本局参与游戏玩家
    beginPlayer = {} 
    for(var i = 0;i < GAME_PLAYER;i++){
      if(player[i].isActive){
        beginPlayer[i] = true
      }
    }

    gameState = GS_ROB_BANKER
    switch(room.bankerMode){
      case MODE_BANKER_ROB :
        //初始化抢庄状态为false
        for(var i = 0; i < GAME_PLAYER;i++){
          robState[i] = false
        }
        //抢庄
        var notify = {
          "cmd" : "beginRob"
        }
        local.sendAll(notify)
        setTimeout(local.endRob,TID_ROB_TIME)    
        break
      case MODE_BANKER_ORDER :
        //轮庄
        do{
            banker = (banker + 1)%GAME_PLAYER
        }while(player[banker].isActive == false)

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
      if(robState[i] == true){
        robList[num++] = i
      }
    }
    //console.log("endRob num : "+num)
    //无人抢庄将所有参与游戏的玩家加入抢庄列表
    if(num == 0){
      for(var i = 0; i < GAME_PLAYER;i++){
        //console.log("i : "+i +"player[i].isActive : "+player[i].isActive+" beginPlayer[i] : "+ beginPlayer[i])
        if(player[i].isActive && beginPlayer[i]){
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
        console.log("banker : "+banker)
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
          "bonusPool" : bonusPool
        }
        local.sendAll(notify)          
      }
      //提前发牌
      //洗牌
      for(var i = 0;i < cardCount;i++){
        var tmpIndex = Math.floor(Math.random() * (cardCount - 0.000001))
        var tmpCard = cards[i]
        cards[i] = cards[tmpIndex]
        cards[tmpIndex] = tmpCard
      }
      //发牌
      var index = 0;
      for(var i = 0;i < GAME_PLAYER;i++){
          if(player[i].isActive && beginPlayer[i]){
            for(var j = 0;j < 5;j++){
              player[i].handCard[j] = cards[index++];
            }
          }
      }
      //明牌模式发牌
      if(room.cardMode == conf.MODE_CARD_SHOW){
        var notify = {
          "cmd" : "MingCard"
        }
        for(var i = 0;i < GAME_PLAYER;i++){
          if(player[i].isActive && beginPlayer[i]){
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
          if(beginPlayer[i] && player[i].isActive && i != banker && betList[i] == 0){
            betList[i] = 1
            betAmount += 1
            local.betMessege(i,1)
          }
      }
      var tmpCards = {}
      //发牌
      for(var i = 0;i < GAME_PLAYER;i++){
          if(beginPlayer[i]){
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
        timer = setTimeout(local.settlement,3000) 
      },TID_SETTLEMENT)
  }

  //结算阶段
  local.settlement = function(){
      clearTimeout(timer)
      log("settlement")
      room.runCount++
      //房间重置
      gameState = GS_FREE
      for(var i = 0;i < GAME_PLAYER; i++){
          player[i].isReady = false;
      }
      readyCount = 0

      //计算牌型
      var result = {}
      for(var i = 0;i < GAME_PLAYER;i++){
          if(beginPlayer[i]){
            result[i] = logic.getType(player[i].handCard); 
            player[i].cardsList[room.runCount] = result[i]           
          }
      }
      var trueResult = deepCopy(result)
      var bankerResult = result[banker]
      //结算分
      var curScores = new Array(GAME_PLAYER)
      for(var i = 0;i < GAME_PLAYER;i++){
        curScores[i] = 0
      }
      switch(room.gameMode){
        case conf.MODE_GAME_NORMAL : 
          //常规模式和明牌模式结算
          for(var i = 0;i < GAME_PLAYER;i++){
            if(player[i].isActive){
                // console.log("banker : "+banker)
                // console.log("i : "+i+"  beginPlayer[i] : "+beginPlayer[i])
                // console.log(result[i])
                // console.log(result[banker])
                if(i === banker || beginPlayer[i] != true) continue
                //比较大小
                if(logic.compare(result[i],result[banker])){
                    //闲家赢
                    curScores[i] += betList[i] * result[i].award
                    curScores[banker] -= betList[i] * result[i].award
                }else{
                    //庄家赢
                    curScores[i] -= betList[i] * result[banker].award
                    curScores[banker] += betList[i] * result[banker].award
                }              
            }

          }
          break
        case conf.MODE_GAME_BULL : 
          //斗公牛模式优先结算庄家赢的钱，再按牌型从高到低结算输的钱，直至积分池为空
          //结算庄家赢
            console.log(betList)
            for(var i = 0;i < GAME_PLAYER;i++){
              if(i === banker || beginPlayer[i] != true) continue
              if(!logic.compare(result[i],result[banker])){
                  //庄家赢
                  var tmpScore = betList[i] * result[banker].award
                  console.log("uid : "+player[i].uid+"  chair : "+i+"  lose tmpScore : "+tmpScore)
                  curScores[i] -= tmpScore
                  curScores[banker] += tmpScore
                  bonusPool += tmpScore
              }
            }
            console.log("bonusPool : "+bonusPool)
            //结算庄家输
            //牌型按大小排序
            var tmpUidList = new Array(GAME_PLAYER)
            for(var i = 0;i < GAME_PLAYER;i++){ tmpUidList[i] = i }
            //console.log(result)
            for(var i = 0;i < GAME_PLAYER - 1;i++){
              for(var j = 0;j < GAME_PLAYER - 1 - i;j++){
                if(!beginPlayer[tmpUidList[j + 1]]){ continue }
                if(beginPlayer[tmpUidList[j]] != true || !logic.compare(result[j],result[j + 1])){
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
              if(tmpUidList[i] === banker || beginPlayer[tmpUidList[i]] != true) continue
              if(logic.compare(result[i],bankerResult)){
                  //闲家赢
                  var tmpScore = betList[tmpUidList[i]] * result[i].award
                  if(tmpScore > bonusPool){
                      tmpScore = bonusPool
                  }
                  console.log("uid : "+player[tmpUidList[i]].uid+"  chair : "+tmpUidList[i]+"  win tmpScore : "+tmpScore)
                  curScores[tmpUidList[i]] += tmpScore
                  curScores[banker] -= tmpScore
                  bonusPool -= tmpScore
              }
            } 
            //积分池空则换庄
            if(bonusPool <= GAME_PLAYER){
                do{
                    banker = (banker + 1)%GAME_PLAYER
                }while(player[banker].isActive == false)
                bonusPool = 40
                bankerTime = 0
                log("banker change : "+banker)
            }else{
              bankerTime++
            }
            //斗牛模式更新积分池
            if(room.gameMode == MODE_GAME_BULL){
              var notify = {
                "cmd" : "bonusPool",
                "bonusPool" : bonusPool
              }
              local.sendAll(notify)          
            }
            console.log("bonusPool : "+bonusPool)           
          break
        case MODE_GAME_SHIP : 
          //开船模式先收集所有人的下注，再按从大到小赔付
          //先减去下注额
          var tmpAllBet = 0
          console.log(betList)
          for(var i = 0;i < GAME_PLAYER;i++){
            if(betList[i] && typeof(betList[i]) == "number" && beginPlayer[i]){
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
              if(beginPlayer[tmpUidList[j + 1]] != true){ 
                continue 
              }
              if(beginPlayer[tmpUidList[j]] != true || !logic.compare(result[j],result[j + 1])){
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
            if(betList[tmpUidList[i]] && typeof(betList[tmpUidList[i]]) == "number" && beginPlayer[tmpUidList[i]]){
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
      //发送当局结算消息
      var notify = {
        "cmd" : "settlement",
        "result" : trueResult,
        "curScores" : curScores,
        "beginPlayer" : beginPlayer
      }
      if(room.gameMode === conf.MODE_GAME_BULL){
        notify.bankerTime = bankerTime
      }
      local.sendAll(notify)

      if(room.gameNumber <= 0){
          local.gameOver()
      }
  }
  //总结算
  local.gameOver = function() {
    //总结算
    room.state = true
    var notify = {
      "cmd" : "gameOver",
      "player" : player
    }

    local.sendAll(notify)
    //结束游戏
    roomCallBack(room.roomId,player,local.init)
  }
  //积分改变
  local.changeScore = function(chair,score) {
        player[chair].score += score;
        var notify = {
          "cmd" : "changeScore",
          "chair" : chair,
          "difference" : score,
          "score" : player[chair].score
        }      
        local.sendAll(notify)        
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
    beginPlayer = {}
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
    //下注上限
    maxBet = 0
    //斗公牛模式积分池
    bonusPool = 40
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
      player[chiar].cardsList  = {}           //总战绩列表
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
  room.finishGame = function() {
    //游戏一局都没开始则不扣钻石
    if(room.runCount == 0){
      room.needDiamond = 0
      room.isRecord = false
    }
    room.gameNumber = 0
    local.settlement()
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
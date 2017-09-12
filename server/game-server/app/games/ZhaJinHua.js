//炸金花
var logic = require("./logic/SanKungLogic.js")
var conf = require("../conf/niuniuConf.js").niuConf
var tips = require("../conf/tips.js").tipsConf
var frame = require("./frame/frame.js")
var MING_CARD_NUM = 3               //明牌数量
var MAX_ROUND = 10
//游戏状态

//创建房间
  module.exports.createRoom = function(roomId,channelService,gameBegincb,gameOvercb) {
    console.log("createRoom"+roomId)
    var roomBeginCB = gameBegincb
    var roomCallBack = gameOvercb
    var room = {}
    room.roomId = roomId
    room.roomType = "sanKung"
    room.isRecord = true
    room.channel = channelService.getChannel(roomId,true)
    room.handle = {}   //玩家操作
    room.halfwayEnter = true             //允许中途加入
    room.agencyId = 0                    //代开房玩家ID
    room.beginTime = (new Date()).valueOf()
    room.MatchStream = {}
    //房间初始化
    var local = {}                       //私有方法
    var player = {}                      //玩家属性
    var readyCount = 0                   //游戏准备人数
    var gameState = conf.GS_FREE         //游戏状态
    var banker = 0                       //庄家椅子号
    var roomHost = -1                    //房主椅子号
    var timer                            //定时器句柄
    room.GAME_PLAYER = 6                 //游戏人数
    GAME_PLAYER = 6

    //炸金花特殊数据
    var curPlayer = -1                   //当前操作玩家
    var curRound = 0                     //当前轮数
    var curBet = 1                       //当前单注
    room.maxBet = 10                     //单注上限

    var result = {}                      //牌型
    var actionFlag = true                //行动标志
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

    room.runCount = 0
   //房间初始化
    local.init = function() {
      //console.log("enter init=====================================")
      room.gameMode = 0                    //游戏模式
      room.gameNumber = 0                  //游戏局数
      room.maxGameNumber = 0               //游戏最大局数
      room.consumeMode = 0                 //消耗模式
      room.needDiamond = 0                 //钻石基数
      //房间属性
      room.state = true                    //房间状态，true为可创建
      room.playerCount  = 0                //房间内玩家人数
      readyCount = 0                   //游戏准备人数
      gameState = conf.GS_FREE              //游戏状态
      room.chairMap = {}                   //玩家UID与椅子号映射表
      banker = -1                      //庄家椅子号
      roomHost = -1                    //房主椅子号
      timer = undefined                //定时器句柄
      //游戏属性
      robState = new Array(GAME_PLAYER) //抢庄状态记录
      //console.log("enter init=====================================111111111111111")
      //下注信息
      betList = new Array(GAME_PLAYER)
      for(var  i = 0;i < GAME_PLAYER;i++){
        betList[i] = 0
      }
      betAmount = 0
      //下注上限
      maxBet = 0
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
    local.newRoom = function(uid,sid,param,cb) {
      //console.log("newRoom")
      log("newRoom"+uid)
        //无效条件判断
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
      if(!param.basic || typeof(param.basic) !== "number" || 
        param.basic < 0 || param.basic > 5){
        log("newRoom error   param.basic : "+param.basic)
        cb(false)
        return
      }   
      if(!param.maxBet || typeof(param.maxBet) !== "number" || 
        param.maxBet < 0 || param.maxBet > 20){
        log("newRoom error   param.maxBet : "+param.maxBet)
        cb(false)
        return
      }       
      if(typeof(param.isWait) !== "boolean"){
        param.isWait = true
      }
      frame.start(param.isWait)
      //是否允许中途加入
      if(param.halfwayEnter === false){
        room.halfwayEnter = false
      }
      //房间初始化
      local.init()
      room.state = false
      room.playerCount  = 0            //房间内玩家人数
      readyCount = 0                   //游戏准备人数
      gameState = conf.GS_FREE         //游戏状态
      room.chairMap = {}               //玩家UID与椅子号映射表
      roomHost = 0                     //房主椅子号
      room.gameMode = Math.floor(param.gameMode)                     //游戏模式
      room.gameNumber = Math.floor(param.gameNumber)                 //游戏局数
      room.maxGameNumber = Math.floor(param.gameNumber)              //游戏最大局数
      room.consumeMode = Math.floor(param.consumeMode)               //消耗模式
      room.basic = Math.floor(param.basic)                           //房间底分
      room.maxBet = Math.floor(param.maxBet)                         //单注上限
      room.needDiamond = Math.ceil(room.gameNumber / 10)             //本局每人消耗钻石
      cb(true)
    }
    room.handle.agency = function(uid,sid,param,cb) {
      local.newRoom(uid,sid,param,function(flag) {
          if(flag){
            room.needDiamond = 0
            roomHost = -1
            room.agencyId = uid
          }
          cb(flag)
      })  
    }
    //创建房间
    room.handle.newRoom = function(uid,sid,param,cb) {
      local.newRoom(uid,sid,param,function(flag) {
          if(flag){
            room.handle.join(uid,sid,{ip : param.ip,playerInfo : param.playerInfo},cb)
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
          if(player[i].uid === uid){
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
      player[chair].isOnline = true
      player[chair].isNoGiveUp = true //true表示未放弃
      player[chair].uid = uid
      player[chair].ip = param.ip
      player[chair].playerInfo = param.playerInfo
      //玩家数量增加
      room.playerCount++

      var notify = {
        cmd: "userJoin",
        uid: uid,
        chair : chair,
        player : player[chair]
      }
      local.sendAll(notify)


      if(!room.channel.getMember(uid)){
        room.channel.add(uid,sid)
      }
      notify = local.getRoomInfo(chair)
      local.sendUid(uid,notify)
      cb(true)
    }
    room.handle.ready = function(uid,sid,param,cb) {
      var chair = room.chairMap[uid]
      if(chair === undefined){
        cb(false)
        return
      }
      frame.ready(uid,chair,player,gameState,local, local.gameBegin,-1,cb)
    }

    //游戏开始
    local.gameBegin = function(argument) {
      log("gameBegin") 
      gameState = conf.GS_GAMEING
      //第一次开始游戏调用游戏开始回调
      if(room.gameNumber === room.maxGameNumber){
        roomBeginCB(room.roomId,room.agencyId)
      }
      room.gameNumber--
      //重置下注信息
      for(var i = 0;i < GAME_PLAYER;i++){
        if(player[i].isReady){
            betList[i] = 0
            player[i].isShowCard = false
          }
      }
      betAmount = 0
      //换庄
      
      //换一副新牌
      cards = {}                       //牌组
      cardCount = 0                    //卡牌剩余数量
      for(var i = 1;i <= 13;i++){
        for(var j = 0;j < 4;j++){
          cards[cardCount++] = {num : i,type : j}
        }
      }
      //洗牌
      for(var i = 0;i < cardCount;i++){
        var tmpIndex = Math.floor(Math.random() * (cardCount - 0.000001))
        var tmpCard = cards[i]
        cards[i] = cards[tmpIndex]
        cards[tmpIndex] = tmpCard
      }
      //发牌
      var tmpResult = {}
      for(var i = 0;i < GAME_PLAYER;i++){
          if(player[i].isActive && player[i].isReady){
            for(var j = 0;j < 3;j++){
              player[i].handCard[j] = cards[index++];
            }
          }
      }
      //计算牌型
      result = {}
      for(var i = 0;i < GAME_PLAYER;i++){
          if(player[i].isReady){
            result[i] = logic.getType(player[i].handCard); 
            //player[i].cardsList[room.runCount] = result[i]           
          }
      }
      //开始第一轮
      curRound = 0
      curPlayer = banker
      while(player[curPlayer].isActive == false || player[curPlayer].isNoGiveUp == false || player[curPlayer].isReady == false){
        curPlayer = (curPlayer + 1)%GAME_PLAYER
        banker = curPlayer
      }
      actionFlag = false
      local.nextCurPlayer()
    }

    //操作权移交到下一位玩家
    local.nextCurPlayer = function() {
      if(actionFlag == false){
        //未操作视为放弃
        local.playerGiveUp(curPlayer) 
        if(curPlayerCount < 2){
          local.settlement()
          return
        }
      }
      actionFlag = false
      var bankerFlag = false    //是否轮回到庄家
      do{
        curPlayer = (curPlayer + 1)%GAME_PLAYER
        if(curPlayer == banker){
          bankerFlag = true
        }
      }while(player[curPlayer].isActive == false || player[curPlayer].isNoGiveUp == false || player[curPlayer].isReady == false)
      //console.log("111111  curRound : "+curRound)
      //当操作权转移到初始操作玩家   进入下一轮
      if(bankerFlag){
          if(curRound == 3){
            //进入结算
            local.settlement()
            return
          }
          curRound++
          curBet = 0
          for(var i = 0;i < GAME_PLAYER;i++){
            if(player[i].isActive){
              var notify = {
                "cmd" : "curRound",
                "curRound" : curRound
              }
              if(room.cardMode == conf.MODE_CARD_SHOW || (room.cardMode == conf.MODE_CARD_HIDE && player[i].isShowCard)){
                //已放弃不发牌
                if(player[i].isNoGiveUp == true && player[i].isReady == true){
                  if(curRound == 1){
                      notify.card = player[i].handCard[3]
                  }else if(curRound == 2){
                      notify.card = player[i].handCard[4]
                  }    
                }
              }
              local.sendUid(player[i].uid,notify)    
            }
          }
      }
      var notify = {
        "cmd" : "nextPlayer",
        "chair" : curPlayer,
        "curBet" : curBet
      }
      local.sendAll(notify)
      //设定时器到下一位玩家
      actionFlag = false
      //console.log("now Player : "+curPlayer)
      timer = setTimeout(local.nextCurPlayer,conf.TID_ZHAJINNIU)
    }



    //下注阶段
    local.betting = function() {
      log("betting")
      //状态改变
      gameState = conf.GS_BETTING
      //通知客户端
      var notify = {
        cmd : "beginBetting",
        banker : banker
      }
      local.sendAll(notify)
      //定时器启动下一阶段
      timer = setTimeout(local.deal,conf.TID_BETTING)      
      
    }    
    //发牌阶段  等待摊牌后进入结算
    local.deal = function(){
        log("deal")
        gameState = conf.GS_DEAL
        //若玩家未下注默认下一分
        //默认底分
        for(var i = 0; i < GAME_PLAYER;i++){
            if(player[i].isReady && player[i].isActive && i != banker && betList[i] == 0){
              var tmpBet = 1
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
          local.settlement()
        },conf.TID_SETTLEMENT)
    }    
    //结算
    local.settlement = function() {
      if(gameState !== conf.GS_SETTLEMENT){
         room.runCount++
         readyCount = 0
         clearTimeout(timer)
         gameState = conf.GS_FREE
        //console.log("settlemnt")

        var curScores = new Array(GAME_PLAYER)
        for(var i = 0;i < GAME_PLAYER;i++){
          curScores[i] = 0
        }
        //计算积分
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
        //九点上庄模式换庄
        if(room.bankerMode == conf.MODE_BANKER_JIUDIAN){
          var maxResultFlag = false
          var maxResultIndex = -1
          for(var i = 0;i < GAME_PLAYER;i++){
            if(player[i].isActive && player[i].isReady){
                if(result[i].type >= 9){
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
          }
        }
        //积分改变
        for(var i = 0;i < GAME_PLAYER;i++){
            if(curScores[i] != 0){
              local.changeScore(i,curScores[i])
            }
        }
        var realScores = {}
        //返回玩家实际分数
        for(var i = 0;i < GAME_PLAYER;i++){
            realScores[i] = player[i].score
        }

        //发送当局结算消息
        var notify = {
          "cmd" : "settlement",
          "result" : result,
          "curScores" : curScores,
          "realScores" : realScores,
          "player" : player
        }
        local.sendAll(notify)
        //记录牌局流水
        var stream = {}
        for(var i = 0; i < GAME_PLAYER;i++){
          if(player[i].isActive && player[i].isReady){
              stream[i] = {
                "uid" : player[i].uid,
                "result" : result[i],
                "handCard" : deepCopy(player[i].handCard),
                "changeScore" : curScores[i]
              }
          }
        }
        room.MatchStream[room.runCount] = stream

        //TODO 房间重置
        gameState = conf.GS_FREE
        for(var i = 0;i < GAME_PLAYER; i++){
            player[i].isReady = false
            player[i].isShowCard = false
        }

        if(room.gameNumber <= 0){
            local.gameOver()
        }
      }
    }    
    //玩家抢庄
    room.handle.robBanker = function(uid,sid,param,cb) {
      if(gameState !== conf.GS_ROB_BANKER){
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
    //玩家下注
    room.handle.bet = function(uid,sid,param,cb){
      //游戏状态为BETTING
      if(gameState !== conf.GS_BETTING){
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
      if(param.bet && typeof(param.bet) == "number"
        && param.bet > 0 && param.bet <= 5 && betList[chair] == 0){
        var tmpbet = param.bet
        betList[chair] += tmpbet
        betAmount += tmpbet
        local.betMessege(chair,tmpbet)
      }else{
        cb(false)
        return
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
    //玩家操作
    room.handle.useCmd = function(uid,sid,param,cb) {
      if(gameState !== conf.GS_GAMEING){
        cb(false)
        return
      }
      var chair = room.chairMap[uid]
      if(chair === undefined){
        cb(false)
        return
      }
      // switch(param.cmd){

      // }

      cb(true)
    }
    room.handle.showCard = function(uid,sid,param,cb) {
      //游戏状态为GS_DEAL
      if(gameState !== conf.GS_DEAL){
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
    local.gameOver = function(flag) {
      clearTimeout(timer)
      //总结算
      room.state = true
      var notify = {
        "cmd" : "gameOver",
        "player" : player
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
    //玩家重连
    room.reconnection = function(uid,sid,param,cb) {
      // console.log("uid : "+uid + "  reconnection")
      var chair = room.chairMap[uid]
      if(chair === undefined){
        cb(false)
        return
      }
      player[chair].isOnline = true
      var notify = {
        cmd: "userReconnection",
        uid: uid,
        chair : chair
      }
      local.sendAll(notify)
      if(!room.channel.getMember(uid)){
        room.channel.add(uid,sid)
      }
      var notify = {
        roomInfo : local.getRoomInfo(chair),
        betList : betList,
        state : gameState,
        surplusGameNumber : room.maxGameNumber - room.gameNumber,
        freeState : param
      }
      cb(notify)
    }
  //初始化椅子信息
  local.initChairInfo = function(chair) {
      player[chair] = {}
      player[chair].chair = chair             //椅子号
      player[chair].uid = 0                   //uid
      player[chair].isActive = false          //当前椅子上是否有人
      player[chair].isOnline = false          //玩家是否在线
      player[chair].isReady = false           //准备状态
      player[chair].isBanker = false          //是否为庄家
      player[chair].isNoGiveUp = false        //是否未放弃游戏  true表示未放弃   false表示已放弃            
      player[chair].isShowCard = false        //是否开牌
      player[chair].handCard = new Array(3)   //手牌
      player[chair].score = 0                 //当前积分
      player[chair].bankerCount = 0           //坐庄次数
      //player[chair].cardsList  = {}           //总战绩列表
      player[chair].ip  = undefined           //玩家ip地址
  }
    //玩家离开
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
        if((room.bankerMode == conf.MODE_BANKER_HOST || room.bankerMode == conf.MODE_BANKER_JIUDIAN) && banker == chair){
          return
        }
        frame.disconnect(chair,player,gameState,local,local.gameBegin)
      }
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
    local.getRoomInfo = function(chair) {
      var newPlayer = deepCopy(player)
      if(gameState < conf.GS_DEAL){
        for(var i = 0; i < GAME_PLAYER;i++){
          delete newPlayer[i].handCard
        }        
      }
      var notify = {
        cmd : "roomPlayer",
        player:newPlayer,
        gameMode : room.gameMode,
        maxGameNumber : room.maxGameNumber,
        gameNumber : room.maxGameNumber - room.gameNumber,
        consumeMode : room.consumeMode,
        bankerMode : room.bankerMode,
        roomId : room.roomId,
        TID_ROB_TIME : conf.TID_ROB_TIME, 
        TID_BETTING : conf.TID_BETTING,
        TID_SETTLEMENT : conf.TID_SETTLEMENT,        
        betList : betList,
        state : gameState,
        roomType : room.roomType,
        curPlayer : curPlayer,
        curRound : curRound,
        curBet : curBet,
        maxBet : room.maxBet,
        betAmount : betAmount
      }
      return notify
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
    // console.log("LOG NiuNiu : "+str)
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



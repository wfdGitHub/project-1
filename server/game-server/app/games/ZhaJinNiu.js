var logic = require("./NiuNiuLogic.js")
var conf = require("../conf/niuniuConf.js").niuConf
var tips = require("../conf/tips.js").tipsConf
var frame = require("./frame/frame.js")
//常量定义
var GAME_PLAYER = conf.GAME_PLAYER      //游戏人数
var TID_ROB_TIME = conf.TID_ROB_TIME    //抢庄时间
var TID_BETTING = conf.TID_BETTING      //下注时间
var TID_SETTLEMENT = conf.TID_SETTLEMENT//结算时间

var MING_CARD_NUM = 3               //明牌数量
//游戏状态

//创建房间
  module.exports.createRoom = function(roomId,channelService,cb) {
    console.log("createRoom"+roomId)
    var roomCallBack = cb
    var room = {}
    room.roomId = roomId
    room.roomType = "zhajinniu"
    room.isRecord = true
    room.channel = channelService.getChannel(roomId,true)
    room.handle = {}   //玩家操作
    room.gameMode = 5
    room.halfwayEnter = true             //允许中途加入
    room.agencyId = 0                    //代开房玩家ID
    room.beginTime = (new Date()).valueOf() //游戏开始时间戳
    room.MatchStream = {}
    //房间初始化
    var local = {}                       //私有方法
    var player = {}                      //玩家属性
    var readyCount = 0                   //游戏准备人数
    var gameState = conf.GS_FREE         //游戏状态
    var banker = -1                      //庄家椅子号  庄家代表最先开始操作的玩家
    var roomHost = -1                    //房主椅子号
    var timer                            //定时器句柄
    room.GAME_PLAYER = 6                 //游戏人数
    GAME_PLAYER = 6
    var curPlayer = -1                   //当前操作玩家
    var curRound = 0                     //当前轮数
    var curPlayerCount = 0               //当前参与游戏人数
    var curBet = 0                       //当前下注
    var result = {}                      //牌型
    var basic = 0                        //房间底分
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

    //下注上限
    var maxBet = 0

    //斗公牛模式积分池
    var bonusPool = 40
    var robState,betList
    room.runCount = 0
   //房间初始化
    local.init = function() {
      //console.log("enter init=====================================")
      room.gameNumber = 0                  //游戏局数
      room.maxGameNumber = 0               //游戏最大局数
      room.consumeMode = 0                 //消耗模式
      room.bankerMode  = 0                 //定庄模式
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
      curRound = 0
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
      for(var  i = 0;i < GAME_PLAYER;i++){
        betList[i] = 0
      }
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
      if(!param.cardMode || typeof(param.cardMode) !== "number" || param.cardMode > 2 || param.cardMode < 0){
        log("newRoom error   param.cardMode : "+param.cardMode)
        cb(false)
        return
      } 
      if(!param.basic || typeof(param.basic) !== "number" || param.basic < 1 || param.basic > 3){
        log("newRoom error   param.basic : "+param.basic)
        cb(false)
        return        
      }
      if(param.halfwayEnter === false){
        room.halfwayEnter = false
      }
      //房间初始化
      local.init()
      basic = param.basic
      room.state = false
      room.playerCount  = 0            //房间内玩家人数
      readyCount = 0                   //游戏准备人数
      gameState = conf.GS_FREE         //游戏状态
      room.chairMap = {}               //玩家UID与椅子号映射表
      roomHost = 0                     //房主椅子号
      banker = roomHost                //庄家椅子号
      room.gameNumber = 2                 //游戏局数
      room.maxGameNumber = param.gameNumber              //游戏最大局数
      room.consumeMode = param.consumeMode               //消耗模式
      room.cardMode = param.cardMode                     //明牌模式
      room.needDiamond = Math.ceil(room.gameNumber / 10) //本局每人消耗钻石
      //设置下注上限
      maxBet = 20
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
      var newPlayer = deepCopy(player)
      //明牌模式保留三张牌可见  暗牌模式手牌不可见
      if(room.cardMode == conf.MODE_CARD_SHOW){
        for(var i = 0; i < GAME_PLAYER;i++){
            delete newPlayer[i].handCard[4]
            delete newPlayer[i].handCard[3]
        }
      }else if(room.cardMode == conf.MODE_CARD_HIDE){
        for(var i = 0; i < GAME_PLAYER;i++){
            delete newPlayer[i].handCard
        }
      }

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
        cardMode : room.cardMode,
        roomId : room.roomId,
        TID_ZHAJINNIU : conf.TID_ZHAJINNIU,
        curRound : curRound,
        curPlayer : curPlayer,
        betList : betList,
        state : gameState,
        roomType : room.roomType,
        basic : basic,
        curBet : curBet
      }
      //console.log(notify)
      local.sendUid(uid,notify)
      //console.log(room.channel)
      cb(true)
    }
    room.handle.ready = function(uid,sid,param,cb) {
      var chair = room.chairMap[uid]
      if(chair === undefined){
        cb(false)
        return
      }
      frame.ready(uid,chair,player,gameState,local,local.gameBegin,cb)
    }
    //游戏开始
    local.gameBegin = function(argument) {
        log("gameBegin") 
        gameState = conf.GS_GAMEING     
        room.gameNumber--
        //重置下注信息
        for(var i = 0;i < GAME_PLAYER;i++){
          if(player[i].isReady){
              betList[i] = basic;
              player[i].isShowCard = false    
            }
        }
        var notify = {
          "cmd" : "gameBegin",
          "betList" : betList
        }
        local.sendAll(notify)

      //增加大牌概率，当牌型权重较低时重新洗牌
      var randTimes = 0
       var index = 0;
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
        var tmpResult = {}
        index = 0;
        var tmpAllCount = 0     //总玩家数
        var tmpTypeCount = 0    //牌型权重 

        for(var i = 0;i < GAME_PLAYER;i++){
            if(player[i].isActive && player[i].isReady){
              for(var j = 0;j < 5;j++){
                player[i].handCard[j] = cards[index++];
              }
              tmpAllCount++
              tmpResult[i] = logic.getType(player[i].handCard)
              tmpTypeCount += conf.typeWeight[tmpResult[i].type]
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

      console.log("============1")
      console.log(tmpCards)
      console.log("============1")
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
      console.log("luckyValue : ")
      console.log(luckyValue)
      //运气值低的先执行控制 
      for(var i = 0;i < GAME_PLAYER;i++){
          if(player[i].isActive && player[i].isReady){
              if(luckyValue[i] < 0){
                if(Math.random() < -luckyValue[i]){
                  //换好牌
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

      //记录参与游戏人数
      curPlayerCount = 0
      for(var i = 0;i < GAME_PLAYER;i++){
          if(player[i].isActive && player[i].isReady){
            curPlayerCount++
          }
      }
      //计算牌型
      result = {}
      for(var i = 0;i < GAME_PLAYER;i++){
          if(player[i].isReady){
            result[i] = logic.getType(player[i].handCard); 
            player[i].cardsList[room.runCount] = result[i]           
          }
      }

      //开始第一轮
      curRound = 0
      curPlayer = banker
      while(player[curPlayer].isActive == false || player[curPlayer].isNoGiveUp == false || player[curPlayer].isReady == false){
        curPlayer = (curPlayer + 1)%GAME_PLAYER
        banker = curPlayer
      }
      curBet = 0
      //明牌模式
      if(room.cardMode == conf.MODE_CARD_SHOW){
        //先发三张牌
        var notify = {
          "cmd" : "curRound",
          "curRound" : curRound,
          "cards" : {}
        }
        for(var i = 0;i < GAME_PLAYER;i++){
          if(player[i].isActive && player[i].isReady){
            var tmpCards = {}
            for(var j = 0;j < MING_CARD_NUM;j++){
                tmpCards[j] = player[i].handCard[j];
            }
            notify.cards[i] = tmpCards  
          }
        }
        local.sendAll(notify)  
      }else if(room.cardMode == conf.MODE_CARD_HIDE){
        //暗牌模式
        var notify = {
          "cmd" : "curRound",
          "curRound" : curRound
        }
        for(var i = 0;i < GAME_PLAYER;i++){
          if(player[i].isActive && player[i].isReady){
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
      actionFlag = false
      timer = setTimeout(local.nextCurPlayer,conf.TID_ZHAJINNIU)
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
    local.playerGiveUp = function(chair) {
          player[chair].isNoGiveUp = false
          curPlayerCount--

          var notify = {
            "cmd" : "giveUp",
            "chair" : chair
          }
          for(var i = 0;i < GAME_PLAYER;i++){
            if(i != chair){
              local.sendUid(player[i].uid,notify)
            }
          }
          //发送玩家手牌
          if(curRound == 0){
              delete player[chair].handCard[4]
              delete player[chair].handCard[3]
          }else if(curRound == 1){
              delete player[chair].handCard[4]
          }               
          notify.handCard = player[chair].handCard
          local.sendUid(player[chair].uid,notify)
          actionFlag = true
          //清除计时器 
          clearTimeout(timer)
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
      switch(param.cmd){
        case "look":
          //暗牌模式才能看牌
          if(room.cardMode !== conf.MODE_CARD_HIDE){
            cb(false)
            return
          }
          if(player[chair].isReady && player[chair].isNoGiveUp == true && player[chair].isShowCard == false){
            player[chair].isShowCard = true
            //发送玩家手牌
            var handCard = deepCopy(player[chair].handCard)
            if(curRound == 0){
              delete handCard[3]
              delete handCard[4]
            }else  if(curRound == 1){
              delete handCard[4]
            }
            for(var i = 0; i < GAME_PLAYER; i++){
              if(player[i].isOnline && player[i].isActive){
                var notify = {
                  "cmd" : "lookCard",
                  "chair" : chair
                }
                if(i == chair){
                  notify.handCard = handCard
                }
                local.sendUid(player[i].uid,notify)
              }
            }
            cb(true)
          }else{
            cb(false)
          }
          return
        case "bet":
          //下注
          if(curPlayer !== chair){
            cb(false)
            return
          }
          if(!param.bet || typeof(param.bet) != "number" || param.bet < 0 || param.bet > 5 || param.bet < curBet){
            cb(false)
            return
          }
          if(player[chair].isNoGiveUp == false){
            cb(false)
            return
          }

          curBet = param.bet
          if(player[chair].isShowCard == true){
            param.bet *= 2
          }
          betList[chair] += param.bet
          var notify = {
            "cmd" : "bet",
            "bet" : param.bet,
            "chair" : chair,
            "curBet" : betList[chair]
          }
          local.sendAll(notify)
          //清除计时器  轮到下一个玩家操作
          actionFlag = true
          clearTimeout(timer)
          local.nextCurPlayer()
          cb(true)
          return
        case "giveUp":
          if(curPlayer !== chair){
            cb(false)
            return
          }
          if(player[chair].isNoGiveUp == false){
            cb(false)
            return
          }       
          local.playerGiveUp(chair)
          if(curPlayerCount >= 2){
            //轮到下一个玩家操作
            local.nextCurPlayer()
          }else{
            //TODO 游戏结束
            local.settlement()
          } 
          cb(true)         
          return
        case "compare" :
          //比牌
          //console.log("111111111")
          if(curPlayer !== chair){
            cb(false)
            return
          }
          //console.log("2222222222")
          if(player[chair].isNoGiveUp == false){
            cb(false)
            return
          }        
          //console.log("3333333")
          var target = param.target
          if(target === undefined || target == chair || typeof(target) !== "number" || 
            !player[target] || !player[target].isActive 
            || !player[target].isReady || player[target].isNoGiveUp == false){
            cb(false)
            return            
          }
          //console.log("44444444")
          //第二轮才能比牌      
          if(curRound !== 2){
            cb(false)
            return            
          }
          //console.log("5555555555")
          var bet = 0
          //扣除当前下注额+3分
           bet += 3
           if(player[chair].isShowCard == true){
             bet += curBet * 2
           }else{
            bet += curBet
           }
           betList[chair] += bet
          var notify = {
            "cmd" : "bet",
            "bet" : bet,
            "chair" : chair,
            "curBet" : betList[chair]
          }
          local.sendAll(notify)

          //输的人视为放弃
          var notify2 = {
            "cmd" : "compare",
            "chair" : chair,
            "target" : target
          }
          var lose = 0
          if(logic.compare(result[chair],result[target])){
              player[target].isNoGiveUp = false
              notify2.winPlayer = chair
              lose = target
          }else{
            player[chair].isNoGiveUp = false
            notify2.winPlayer = target
            lose = chair
          }
          for(var i = 0;i < GAME_PLAYER;i++){
            if(i != lose){
              local.sendUid(player[i].uid,notify2)
            }
          }
          //发送玩家手牌
          var handCard = deepCopy(player[lose].handCard)
          notify2.handCard = handCard
          local.sendUid(player[lose].uid,notify2)

          curPlayerCount--
          actionFlag = true
          clearTimeout(timer)
          if(curPlayerCount >= 2){
            //清除计时器  轮到下一个玩家操作
            local.nextCurPlayer()
          }else{
            //TODO 游戏结束
            local.settlement()
          }     
          cb(true)     
          return
      }

      cb(true)
    }
    //结算
    local.settlement = function() {
      if(gameState !== conf.GS_SETTLEMENT){
        room.runCount++
         clearTimeout(timer)
         gameState = conf.GS_SETTLEMENT
        //console.log("settlemnt")
        readyCount = 0

        //找出第一个在座位上且参与游戏的玩家
        var maxIndex = 0
        while(maxIndex < GAME_PLAYER && (player[maxIndex].isActive == false || player[maxIndex].isReady == false || player[maxIndex].isNoGiveUp == false)){
          maxIndex++
        }
        //console.log("chair : "+maxIndex)
        for(var i = maxIndex+1;i < GAME_PLAYER;i++){
          if(player[i].isActive && player[i].isReady && player[i].isNoGiveUp && maxIndex != i){
            //console.log("change")
            if(logic.compare(result[maxIndex],result[i]) == false){
                maxIndex = i
            }
          }
        }
        //console.log("chair : "+maxIndex)
        //console.log(result)
        var curScores = new Array(GAME_PLAYER)
        for(var i = 0;i < GAME_PLAYER;i++){
          curScores[i] = 0
        }
        //赢家通吃
        for(var i = 0;i < GAME_PLAYER;i++){
          if(i != maxIndex){
            curScores[i] -= betList[i]
            curScores[maxIndex] += betList[i]
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
                "handCard" : player[i].handCard,
                "changeScore" : curScores[i]
              }
          }
        }
        room.MatchStream[room.runCount] = stream

        //房间重置
        gameState = conf.GS_FREE
        for(var i = 0;i < GAME_PLAYER; i++){
            player[i].isReady = false
            player[i].isNoGiveUp = true
            player[i].isShowCard = false
        }
        banker = (banker + 1) % GAME_PLAYER
        if(room.gameNumber <= 0){
            local.gameOver()
        }
        
      }
    }
    local.gameOver = function(flag) {
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
        if(player[i].isActive && player[i].isReady){
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
      var newPlayer = deepCopy(player)

      if(room.cardMode == conf.MODE_CARD_SHOW){
        for(var i = 0; i < GAME_PLAYER;i++){ 
            if(i == chair){
              if(curRound == 0){
                delete newPlayer[i].handCard[3]
                delete newPlayer[i].handCard[4]
              }else if(curRound == 1){
                  delete newPlayer[i].handCard[4]
              }
            }else{
              delete newPlayer[i].handCard[3]
              delete newPlayer[i].handCard[4]
            }
        }
      }else if(room.cardMode == conf.MODE_CARD_HIDE){
        for(var i = 0; i < GAME_PLAYER;i++){
            if(i == chair){
              if(player[chair].isShowCard){
                if(curRound == 0){
                  delete newPlayer[i].handCard[3]
                  delete newPlayer[i].handCard[4]
                }else if(curRound == 1){
                    delete newPlayer[i].handCard[4]
                }
              }else{
                delete newPlayer[i].handCard
              }
            }else{
              delete newPlayer[i].handCard
            }
        }        
      }
      var notify = {
          roomInfo : {
          player : newPlayer,
          gameNumber : room.maxGameNumber - room.gameNumber,
          maxGameNumber : room.maxGameNumber,
          consumeMode : room.consumeMode,
          bankerMode : room.bankerMode,
          cardMode : room.cardMode,
          roomId : room.roomId,
          TID_ZHAJINNIU : conf.TID_ZHAJINNIU,
          roomType : room.roomType,
          basic : basic,
          curBet : curBet,
          curRound : curRound,
          curPlayer : curPlayer
        },
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
      player[chair].handCard = new Array(5)   //手牌
      player[chair].score = 0                 //当前积分
      player[chair].bankerCount = 0           //坐庄次数
      player[chair].cardsList  = {}           //总战绩列表
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
        frame.disconnect(chair,player,gameState,local.gameBegin)  
      }
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
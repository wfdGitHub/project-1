//炸金花
var logic = require("./logic/ZhaJinHuaLogic.js")
var conf = require("../conf/niuniuConf.js").niuConf
var errorLogger = require("pomelo-logger").getLogger("error-log");
var tips = require("../conf/tips.js").tipsConf
var frameFactory = require("./frame/frame.js")

var MING_CARD_NUM = 3               //明牌数量

//创建房间
  module.exports.createRoom = function(roomId,db,channelService,playerNumber,gameBegincb,gameOvercb) {
    console.log("createRoom"+roomId)
    var roomBeginCB = gameBegincb
    var roomCallBack = gameOvercb
    var frame = frameFactory.createFrame()
    var gameDB = db
    var room = {}
    room.roomId = roomId
    room.roomType = "zhajinhua"
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
    var gameState = conf.GS_FREE         //游戏状态
    var banker = -1                       //庄家椅子号
    var roomHost = -1                    //房主椅子号
    var timer                            //定时器句柄
    room.GAME_PLAYER = playerNumber      //游戏人数
    var GAME_PLAYER = playerNumber
    var betList = []
    //炸金花特殊数据
    var curPlayer = -1                   //当前操作玩家
    var curRound = 0                     //当前轮数
    var curBet = 1                       //当前单注
    room.maxBet = 10                     //单注上限
    room.maxRound = 10                   //单局最大轮数
    room.stuffyRound = 0                 //闷牌轮数
    var tmpGameState = 0

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
    //牌型历史
    var cardHistory = {}
    for(var i = 0;i < GAME_PLAYER;i++){
      cardHistory[i] = []
    }    
    //下注信息
    var betAmount = 0
    //比牌信息
    var compareList = []

    room.runCount = 0
   //房间初始化
    local.init = function() {
      //console.log("enter init=====================================")
      room.gameMode = 8                    //游戏模式
      room.gameNumber = 0                  //游戏局数
      room.maxGameNumber = 0               //游戏最大局数
      room.consumeMode = 0                 //消耗模式
      //房间属性
      room.state = true                    //房间状态，true为可创建
      room.playerCount  = 0                //房间内玩家人数
      gameState = conf.GS_FREE              //游戏状态
      room.chairMap = {}                   //玩家UID与椅子号映射表
      roomHost = -1                    //房主椅子号
      timer = undefined                //定时器句柄
      //游戏属性
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
      if(!param.gameNumber || typeof(param.gameNumber) !== "number" || (param.gameNumber != 10 && param.gameNumber != 15 && param.gameNumber != 20)){
        log("newRoom error   param.gameNumber : "+param.gameNumber)
        cb(false)
        return
      }
      //默认底分
      if(!param.basic || typeof(param.basic) !== "number" || 
        (param.basic != 1 && param.basic != 2 && param.basic != 5)){
        log("newRoom error   param.basic : "+param.basic)
        cb(false)
        return
      }
      //最大单注
      if(!param.maxBet || typeof(param.maxBet) !== "number" || 
        param.maxBet < 0 || param.maxBet > 20){
        log("newRoom error   param.maxBet : "+param.maxBet)
        cb(false)
        return
      }
      //轮数上限
      if(!param.maxRound || typeof(param.maxRound) !== "number" || 
        (param.maxRound != 7 && param.maxRound != 10)){
        log("newRoom error   param.maxRound : "+param.maxRound)
        cb(false)
        return
      }
      //闷牌限制
      if(param.stuffyRound === undefined || typeof(param.stuffyRound) !== "number" || 
         param.stuffyRound < 0 || param.stuffyRound > 3){
        log("newRoom error   param.stuffyRound : "+param.stuffyRound)
        cb(false)
        return
      }      


      if(typeof(param.waitMode) !== "number" || param.waitMode < 0 || param.waitMode > 2){
        log("newRoom error   param.waitMode : "+param.waitMode)
        cb(false)
        return
      }
      frame.start(param.waitMode)
      room.waitMode = param.waitMode
      //是否允许中途加入
      if(param.halfwayEnter === false){
        room.halfwayEnter = false
      }
      //房间初始化
      local.init()
      room.state = false
      room.playerCount  = 0            //房间内玩家人数
      gameState = conf.GS_FREE         //游戏状态
      room.chairMap = {}               //玩家UID与椅子号映射表
      roomHost = 0                     //房主椅子号
      room.gameNumber = Math.floor(param.gameNumber)                 //游戏局数
      room.maxGameNumber = Math.floor(param.gameNumber)              //游戏最大局数
      room.consumeMode = Math.floor(param.consumeMode)               //消耗模式
      room.basic = Math.floor(param.basic)                           //房间底分
      room.maxBet = Math.floor(param.maxBet)                         //单注上限  
      room.maxRound = param.maxRound                                 //单局最大轮数
      room.stuffyRound = param.stuffyRound                           //闷牌轮数
      local.backups(function() {
        cb(true)
      })
    }
    room.handle.agency = function(uid,sid,param,cb) {
      local.newRoom(uid,sid,param,function(flag) {
          if(flag){
            roomHost = -1
            room.agencyId = uid
            room.consumeMode = "agency"
            local.backups()
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
      player[chair].state = 0 
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
      setRoomDB(room.roomId,"player",JSON.stringify(player))
      setRoomDB(room.roomId,"chairMap",JSON.stringify(room.chairMap))      
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
      frame.begin()
      gameState = conf.GS_GAMEING
      //第一次开始游戏调用游戏开始回调
      if(room.gameNumber === room.maxGameNumber){
        roomBeginCB(room.roomId,room.agencyId)
      }
      room.gameNumber--
      //重置下注信息
      for(var i = 0;i < GAME_PLAYER;i++){
        if(player[i].isReady){
            betList[i] = room.basic
            player[i].isShowCard = false
          }
      }
      betAmount = 0
      compareList = []
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
      var index = 0
      for(var i = 0;i < GAME_PLAYER;i++){
          if(player[i].isActive && player[i].isReady){
            for(var j = 0;j < 3;j++){
              player[i].handCard[j] = cards[index++];
            }
          }
      }

      // //增加大牌概率，当牌型权重较低时重新洗牌
      // var randTimes = 0
      // do{
      //   randTimes++
      //   //洗牌
      //   for(var i = 0;i < cardCount;i++){
      //     var tmpIndex = Math.floor(Math.random() * (cardCount - 0.000001))
      //     var tmpCard = cards[i]
      //     cards[i] = cards[tmpIndex]
      //     cards[tmpIndex] = tmpCard
      //   }
      //   //发牌
      //   index = 0
      //   var tmpAllCount = 0     //总玩家数
      //   var tmpTypeCount = 0    //牌型权重 
        
      //   for(var i = 0;i < GAME_PLAYER;i++){
      //       if(player[i].isActive && player[i].isReady){
      //         for(var j = 0;j < 3;j++){
      //           player[i].handCard[j] = cards[index++];
      //         }
      //         tmpAllCount++
      //         result[i] = logic.getType(player[i].handCard)
      //         //console.log("type : "+result[i].type)
      //         tmpTypeCount += result[i].type
      //       }
      //   }
      //   var dealFlag = false
      //   //判断是否重新洗牌
      //   if((tmpTypeCount / tmpAllCount) < 2){
      //       dealFlag = true
      //   }
      // }while(dealFlag && randTimes < 2000)
      //找出剩余牌
      var tmpCards = {}
      var tmpCardCount = 0
      for(var i = index;i < cardCount;i++){
        tmpCards[tmpCardCount++] = deepCopy(cards[i])
      }
      var luckyValue = {}
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
      //计算牌型
      result = {}
      for(var i = 0;i < GAME_PLAYER;i++){
          if(player[i].isReady){
            result[i] = logic.getType(player[i].handCard);
            cardHistory[i].push(result[i])
          }
      }
      //开始第一轮
      curBet = 1
      curRound = 1
      banker = (banker + 1)%GAME_PLAYER
      while(player[banker].isActive == false || player[banker].isReady == false){
        banker = (banker + 1)%GAME_PLAYER
      }
      curPlayer = banker
      actionFlag = false
      var notify = {
        "cmd" : "nextPlayer",
        "chair" : curPlayer,
        "curBet" : curBet,
        "curRound" : curRound
      }
      local.sendAll(notify)
      local.backups(function() {
        timer = setTimeout(local.nextCurPlayer,conf.TID_ZHAJINHUA)
      })
    }

    //操作权移交到下一位玩家
    local.nextCurPlayer = function() {
      local.backups(function() {
        console.log("nextCurPlayer ==== ")
        clearTimeout(timer)
        if(actionFlag == false){
          //未操作视为放弃
          local.playerGiveUp(curPlayer) 
        }

        //只剩一个玩家的时候结束本局
        var curPlayerCount = 0
        for(var i = 0; i < GAME_PLAYER; i++){
          if(player[i].isActive && player[i].isReady && player[i].state == 0){
            curPlayerCount++
          }
        }
        if(curPlayerCount < 2){
          local.settlement()
          return
        }
        //下一个玩家开始操作
        actionFlag = false
        var bankerFlag = false    //是否轮回到庄家
        do{
          curPlayer = (curPlayer + 1)%GAME_PLAYER
          if(curPlayer == banker){
            bankerFlag = true
          }
        }while(player[curPlayer].isActive == false || player[curPlayer].state !== 0 || player[curPlayer].isReady == false)
        //当操作权转移到初始操作玩家  意味着进入下一轮
        if(bankerFlag){
          curRound++
          //轮数超过最后一轮时进入结算
          if(curRound > room.maxRound){
            local.settlement()
            return
          }
        }
        var notify = {
          "cmd" : "nextPlayer",
          "chair" : curPlayer,
          "curBet" : curBet,
          "curRound" : curRound
        }
        local.sendAll(notify)
        //设定时器到下一位玩家
        actionFlag = false
        timer = setTimeout(local.nextCurPlayer,conf.TID_ZHAJINHUA)
      })
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
      console.log("cmd : "+param.cmd)
      switch(param.cmd){
        case "look":
          //看牌
          //闷牌轮数内不能看牌
          if(curRound <= room.stuffyRound){
            cb(false)
            return
          }
          if(player[chair].isReady && player[chair].state == 0 && player[chair].isShowCard == false){
            player[chair].isShowCard = true
            //发送玩家手牌
            var handCard = deepCopy(player[chair].handCard)
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
        case "gen" :
          //跟注
          if(curPlayer !== chair){
            cb(false)
            return
          }
          if(player[chair].state !== 0){
            cb(false)
            return
          }     
          //最后一轮不能下注
          if(curRound == room.maxRound){
            cb(false)
            return
          }
          var tmpBet = curBet
          if(player[chair].isShowCard == true){
            tmpBet *= 2
          }
          betList[chair] += tmpBet
          var notify = {
            "cmd" : "bet",
            "bet" : tmpBet,
            "chair" : chair,
            "playerBet" : betList[chair]
          }
          local.sendAll(notify)
          //轮到下一个玩家操作
          actionFlag = true
          local.nextCurPlayer()
          cb(true)          
        return
        case "addOne" :
          //加一分
          if(curPlayer !== chair){
            cb(false)
            return
          }
          if(player[chair].state !== 0){
            cb(false)
            return
          }     
          //最后一轮不能下注
          if(curRound == room.maxRound){
            cb(false)
            return
          }
          //加注不能超过单注上限
          if(curBet + 1 > room.maxBet){
            cb(false)
            return
          }
          curBet += 1
          var tmpBet = curBet
          if(player[chair].isShowCard == true){
            tmpBet *= 2
          }
          betList[chair] += tmpBet
          var notify = {
            "cmd" : "bet",
            "bet" : tmpBet,
            "chair" : chair,
            "playerBet" : betList[chair]
          }
          local.sendAll(notify)
          //轮到下一个玩家操作
          actionFlag = true
          local.nextCurPlayer()
          cb(true)           
        return
        case "addTwo" :
          //加两分
          if(curPlayer !== chair){
            cb(false)
            return
          }
          if(player[chair].state !== 0){
            cb(false)
            return
          }     
          //最后一轮不能下注
          if(curRound == room.maxRound){
            cb(false)
            return
          }
          //加注不能超过单注上限
          if(curBet + 2 > room.maxBet){
            cb(false)
            return
          }
          curBet += 2
          var tmpBet = curBet
          if(player[chair].isShowCard == true){
            tmpBet *= 2
          }
          betList[chair] += tmpBet
          var notify = {
            "cmd" : "bet",
            "bet" : tmpBet,
            "chair" : chair,
            "playerBet" : betList[chair]
          }
          local.sendAll(notify)
          //轮到下一个玩家操作
          actionFlag = true
          local.nextCurPlayer()
          cb(true)           
        return          
        case "bet":
          //下注
          // console.log("bet : "+param.bet)
          // if(curPlayer !== chair){
          //   cb(false)
          //   return
          // }
          // if(player[chair].state !== 0){
          //   cb(false)
          //   return
          // }     
          // //最后一轮不能下注
          // if(curRound == room.maxRound){
          //   cb(false)
          //   return
          // }
          // //参数检测    
          // if(!param.bet || typeof(param.bet) != "number" || param.bet != Math.floor(param.bet) 
          //   || param.bet <= 0 || param.bet > room.maxBet || param.bet < curBet){
          //   cb(false)
          //   return
          // }
          // curBet = param.bet
          // if(player[chair].isShowCard == true){
          //   param.bet *= 2
          // }
          // betList[chair] += param.bet
          // var notify = {
          //   "cmd" : "bet",
          //   "bet" : param.bet,
          //   "chair" : chair,
          //   "playerBet" : betList[chair]
          // }
          // local.sendAll(notify)
          // //轮到下一个玩家操作
          // actionFlag = true
          // console.log("=======")
          // local.nextCurPlayer()
          cb(false)
          return
        case "giveUp":
          if(curPlayer !== chair){
            cb(false)
            return
          }
          if(player[chair].state !== 0){
            cb(false)
            return
          }       
          local.playerGiveUp(chair)
          actionFlag = true
          local.nextCurPlayer()
          cb(true)         
          return
        case "compare" :
          //比牌
          if(curPlayer !== chair){
            cb(false)
            return
          }
          if(player[chair].state !== 0){
            cb(false)
            return
          }
          //第三轮开始才能比牌
          if(curRound < 3){
            cb(false)
            return
          }
          var target = param.target
          if(target === undefined || target == chair || typeof(target) !== "number" || 
            !player[target] || !player[target].isActive 
            || !player[target].isReady || player[target].state !== 0){
            cb(false)
            return
          }
          var tmpBet = 0
           if(player[chair].isShowCard == true){
             tmpBet = curBet * 2
           }else{
             tmpBet = curBet
           }
           betList[chair] += tmpBet
          var notify = {
            "cmd" : "compareBet",
            "bet" : tmpBet,
            "chair" : chair,
            "playerBet" : betList[chair]
          }
          local.sendAll(notify)
          //计算剩余玩家数量
          var tmpPlayerCount = 0
          for(var i = 0; i < GAME_PLAYER;i++){
            if(player[i].isReady && player[i].state == 0){
              tmpPlayerCount++
            }
          }
          //输的人状态为比牌失败
          var notify2 = {
            "cmd" : "compare",
            "chair" : chair,
            "target" : target
          }
          var lose = 0
          if(logic.compare(result[chair],result[target])){
              player[target].state = 2
              notify2.winPlayer = chair
              lose = target
          }else{
            player[chair].state = 2
            notify2.winPlayer = target
            lose = chair
          }
          for(var i = 0;i < GAME_PLAYER;i++){
            if(i != lose){
              local.sendUid(player[i].uid,notify2)
            }
          }
          //记录比牌数据
          if(tmpPlayerCount == 2){
            //只剩最后两位玩家比牌时，所有人都可见            
            for(var i = 0; i < GAME_PLAYER;i++){
              if(player[i].isReady){
                if(target != i){
                  if(!compareList[i]){
                    compareList[i] = []
                  }
                  compareList[i].push(target)
                }
                if(chair != i){
                  if(!compareList[i]){
                    compareList[i] = []
                  }
                  compareList[i].push(chair)
                }
              }
            }
          }else{
            if(!compareList[chair]){
              compareList[chair] = []
            }
            compareList[chair].push(target)
            if(!compareList[target]){
              compareList[target] = []
            }
            compareList[target].push(chair)
          }
          
          //发送玩家手牌
          var handCard = deepCopy(player[lose].handCard)
          notify2.handCard = handCard
          local.sendUid(player[lose].uid,notify2)

          actionFlag = true
          local.nextCurPlayer()
          cb(true)
          return
      }
      cb(false)
    }

    //结算
    local.settlement = function() {
      console.log(betList)
      clearTimeout(timer)
      room.runCount++
      //找出最大赢家
      var winIndex = -1
      for(var i = 0;i < GAME_PLAYER;i++){
        if(player[i].isActive && player[i].isReady && player[i].state == 0){
          if(winIndex == -1){
            winIndex = i
          }else{
            if(logic.compare(result[winIndex],result[i])){
              player[i].state = 2
            }else{
              player[winIndex].state = 2
              winIndex = i
            }
          }
        }
      }

      var curScores = new Array(GAME_PLAYER)
      for(var i = 0;i < GAME_PLAYER;i++){
        curScores[i] = 0
      }      
      if(winIndex != -1){
        //赢家通吃
        for(var i = 0;i < GAME_PLAYER;i++){
          if(betList[i] && player[i].isReady && i != winIndex){
            curScores[i] -= betList[i]
            curScores[winIndex] += betList[i]
          }
        }

        //积分改变
        for(var i = 0;i < GAME_PLAYER;i++){
            if(curScores[i] != 0){
              local.changeScore(i,curScores[i])
            }
        }
      }else{
        console.log("ERROR")
        errorLogger.info("炸金花结算错误2222222222")
      }

      var realScores = {}
      //返回玩家实际分数
      for(var i = 0;i < GAME_PLAYER;i++){
          realScores[i] = player[i].score
      }
      //玩家只能看见自己比过或跟自己比过的玩家的手牌
      //发送当局结算消息
      var notify = {
        "cmd" : "settlement",
        "result" : result,
        "curScores" : curScores,
        "realScores" : realScores,
        "player" : player,
        "compareList" : compareList
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
      //房间重置
      gameState = conf.GS_FREE
      for(var i = 0;i < GAME_PLAYER; i++){
          player[i].isReady = false
          player[i].state = 0
          betList[i] = 0;
          player[i].isBanker = false
      }
      if(room.gameNumber <= 0){
          local.gameOver()
      }
    }    
    //玩家放弃
    local.playerGiveUp = function(chair) {
          player[chair].state = 1
          var notify = {
            "cmd" : "giveUp",
            "chair" : chair
          }
          for(var i = 0;i < GAME_PLAYER;i++){
            if(i != chair){
              local.sendUid(player[i].uid,notify)
            }
          }
          notify.handCard = player[chair].handCard
          local.sendUid(player[chair].uid,notify)
          actionFlag = true
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
    local.gameOver = function(flag) {
      clearTimeout(timer)
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
      frame.close()
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
      player[chair].isShowCard = false        //是否开牌
      player[chair].handCard = new Array(3)   //手牌
      player[chair].score = 0                 //当前积分
      player[chair].bankerCount = 0           //坐庄次数
      player[chair].ip  = undefined           //玩家ip地址
      player[chair].state = 0                 //玩家状态  0 正常  1 放弃游戏  2 比牌失败
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
        frame.disconnect(chair,player,gameState,local,local.gameBegin)
      }
    }

    //积分改变
    local.changeScore = function(chair,score) {
          player[chair].score += score;      
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
      for(var i = 0; i < GAME_PLAYER;i++){
        if(i == chair){
          if(player[chair].state == 0 && player[chair].isShowCard == false){
            delete newPlayer[i].handCard
          }
        }else{
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
        roomId : room.roomId,
        TID_ZHAJINHUA : conf.TID_ZHAJINHUA,
        betList : betList,
        state : gameState,
        roomType : room.roomType,
        curPlayer : curPlayer,
        curRound : curRound,
        curBet : curBet,
        maxBet : room.maxBet,
        betAmount : betAmount,
        basic : room.basic,
        maxRound : room.maxRound,
        stuffyRound : room.stuffyRound,
        playerNumber : room.GAME_PLAYER
      }
      return notify
    }
  //房间是否已开始游戏
  room.isBegin = function() {
    if(room.runCount === 0 && (gameState === conf.GS_FREE || gameState === conf.GS_RECOVER)){
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
      room.isRecord = false
    }
    room.gameNumber = 0
    local.gameOver(flag)
  }
  //获取房间数据
  room.getRoomInfo = function(){
    var data = local.getRoomInfo(-1)
    return data
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

  local.backups = function(cb){
    console.log("begin backups=====")
    var dbObj = {
      "basic" : room.basic,
      "gameState" : gameState,
      "chairMap" : JSON.stringify(room.chairMap),
      "roomHost" : roomHost,
      "banker" : banker,
      "gameNumber" : room.gameNumber,
      "maxGameNumber" : room.maxGameNumber,
      "consumeMode" : room.consumeMode,
      "betList" : JSON.stringify(betList),
      "player" : JSON.stringify(player),
      "result" : JSON.stringify(result),
      "playerNumber" : room.GAME_PLAYER,
      "roomType" : room.roomType,
      "agencyId" : room.agencyId,
      "waitMode" : room.waitMode,
      "curPlayer" : curPlayer,
      "curRound" : curRound,
      "curBet" : curBet,
      "maxBet" : room.maxBet,
      "maxRound" : room.maxRound,
      "stuffyRound" : room.stuffyRound,
      "cardHistory" : JSON.stringify(cardHistory)
    }
    setRoomDBObj(room.roomId,dbObj,function() {
      console.log("end backups=====")
      if(cb){
        cb()
      }
    })
  }  

  var setRoomDB = function(hashKey,subKey,data,cb){
    gameDB.hset("gameNodeRoom:"+hashKey,subKey,data,function(err,data) {
      if(err){
        console.log("setRoomDB error : "+err)
        if(cb){
          cb(false)
        }
      }else{
        console.log(data)
        if(cb){
          cb(data)
        }
      }
    })
  }

  var setRoomDBObj = function(hashKey,obj,cb){
    gameDB.hmset("gameNodeRoom:"+hashKey,obj,function(err,data) {
      if(err){
        console.log("setRoomDB error : "+err)
        if(cb){
          cb(false)
        }
      }else{
        console.log(data)
        if(cb){
          cb(data)
        }
      }
    })
  }
  room.recover = function(data) {
    console.log("recover : ")
    console.log(data)
    local.init()
    room.state = false
    room.basic = parseInt(data.basic)
    tmpGameState = parseInt(data.gameState)
    gameState = conf.GS_RECOVER
    room.chairMap = JSON.parse(data.chairMap)
    roomHost = parseInt(data.roomHost)
    banker = parseInt(data.banker)
    room.gameNumber = parseInt(data.gameNumber)
    room.maxGameNumber = parseInt(data.maxGameNumber)
    room.consumeMode = parseInt(data.consumeMode)
    betList = JSON.parse(data.betList)
    player = JSON.parse(data.player)
    result = JSON.parse(data.result)
    room.GAME_PLAYER = parseInt(data.playerNumber)
    GAME_PLAYER = room.GAME_PLAYER
    room.roomType = data.roomType
    room.agencyId = parseInt(data.agencyId)
    room.waitMode = parseInt(data.waitMode)
    curPlayer = parseInt(data.curPlayer)
    curRound = parseInt(data.curRound)
    curBet = parseInt(data.curBet)
    room.maxBet = parseInt(data.maxBet)
    room.maxRound = parseInt(data.maxRound)
    room.stuffyRound = parseInt(data.stuffyRound)
    cardHistory = JSON.parse(data.cardHistory)
    frame.start(room.waitMode)
    for(var index in player){
      player[index].isOnline = false
    }
  }
  local.recover = function() {
    gameState = tmpGameState
    switch(gameState){
      case conf.GS_FREE : 
        for(var index in player){
          player[index].isReady = false
        }
      break
      case conf.GS_GAMEING :
        local.nextCurPlayer()
      break
    }
    var notify = {
      "cmd" : "recover"
    }
    local.sendAll(notify)
  }
  room.handle.recover = function(uid,sid,param,cb) {
    if(gameState !== conf.GS_RECOVER){
      cb(false)
      return
    }
    local.recover()
    cb(true)
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



var logic = require("./logic/NiuNiuLogic.js")
var conf = require("../conf/niuniuConf.js").niuConf
var tips = require("../conf/tips.js").tipsConf
var robotFactory = require("./robot/mingpaiRobot.js")
//var frame = require("./frame/frame.js")
var MING_CARD_NUM = 4  //明牌数量

//创建房间
  module.exports.createRoom = function(roomId,channelService,settlementCB,quitRoom,gemeOver) {
    console.log("createRoom"+roomId)
    var settlementCB = settlementCB
    var quitRoomFun = quitRoom
    var gameOverCB = gemeOver
    var room = {}
    room.roomId = roomId
    room.roomType = "goldMingpai"
    room.isRecord = true
    room.channel = channelService.getChannel(roomId,true)
    room.handle = {}                     //玩家操作
    room.gameMode = 2
    room.halfwayEnter = true             //允许中途加入
    room.agencyId = 0                    //代开房玩家ID 
    room.beginTime = (new Date()).valueOf()
    room.MatchStream = {}
    room.maxResultFlag = false
    //房间初始化
    var local = {}                       //私有方法
    var player = {}                      //玩家属性
    var robots = {}                      //机器人列表
    var readyCount = 0                   //游戏准备人数
    var gameState = conf.GS_FREE         //游戏状态
    var banker = -1                      //庄家椅子号
    var roomHost = -1                    //房主椅子号
    var timer                            //定时器句柄
    room.GAME_PLAYER = 6                 //游戏人数
    GAME_PLAYER = 6
    var curPlayer = -1                   //当前操作玩家
    var curRound = 0                     //当前轮数
    var curPlayerCount = 0               //当前参与游戏人数
    var result = {}                      //牌型
    var basic = 0                        //房间底分
    var actionFlag = true                //行动标志
    var lastScore = {}                   //上一局输赢
    var allowAllin = true                //是否允许推注
    var betAmount = 0
    //游戏属性
    var cards = {}                       //牌组
    var cardCount = 0                    //卡牌剩余数量
    for(var i = 1;i <= 13;i++){
      for(var j = 0;j < 4;j++){
        cards[cardCount++] = {num : i,type : j}
      }
    }
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
      room.maxRob = 0                      //抢庄倍数
      gameState = conf.GS_FREE             //游戏状态
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
      //下注信息
      betList = new Array(GAME_PLAYER)
      for(var  i = 0;i < GAME_PLAYER;i++){
        betList[i] = 0
        lastScore[i] = 0
      }
      
      player = {}       //玩家列表
      robots = {}       //机器人列表
      for(var i = 0;i < GAME_PLAYER;i++){
          local.initChairInfo(i)
      }    
      //channel清空
      channelService.destroyChannel(roomId)
      room.channel = channelService.getChannel(roomId,true)
    }
    //初始化房间
    room.handle.newRoom = function(uids,sids,infos,cb) {
      console.log(uids)
      console.log(sids)
      console.log(infos)
      local.init()
      room.halfwayEnter = true
      basic = 1
      room.basic = basic
      room.playerCount  = 0            //房间内玩家人数
      readyCount = 0                   //游戏准备人数
      gameState = conf.GS_FREE         //游戏状态
      room.chairMap = {}               //玩家UID与椅子号映射表
      roomHost = 0                     //房主椅子号
      banker = roomHost                //庄家椅子号
      room.bankerMode = conf.MODE_BANKER_ROB             //定庄模式
      room.cardMode = conf.MODE_CARD_SHOW                //明牌模式
      room.needGold = 0                                  //本局每人消耗金币
      //设置下注上限
      maxBet = 10
      for(var i = 0; i < uids.length; i++){
        room.handle.join(uids[i],sids[i],infos[i],function(flag) {
          if(flag == false){
            //未知错误
            console.log("error!!!!!")
          }
        })
      }
      cb(true)
      local.readyBegin()
    }
    
    //玩家加入
    room.handle.join = function(uid,sid,info,cb) {
      log("uid : "+uid+"   serverId : "+sid)
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
      player[chair].isReady = false
      player[chair].isOnline = true
      player[chair].uid = uid
      player[chair].ip = info.ip
      player[chair].playerInfo = info
      player[chair].score = parseInt(info.gold)
      player[chair].isRobot = false
      //玩家数量增加
      room.playerCount++

      var notify = {
        cmd: "userJoin",
        uid: uid,
        chair : chair,
        player : player[chair]
      }
      local.sendAll(notify)
      notify = local.getRoomInfo(chair)
      if(info.isRobot == true){
        player[chair].isRobot = true
        //初始化机器人
        robots[chair] = robotFactory.createRobot(notify,player[chair],room.handle,quitRoomFun,conf)
      }else{
        if(!room.channel.getMember(uid)){
          room.channel.add(uid,sid)
        }
      }
      
      local.sendUid(uid,notify)   
      cb(true)
    }
    room.handle.ready = function(uid,sid,param,cb) {
      // if(gameState !== conf.GS_FREE){
      //   cb(false)
      //   return        
      // }
      // var chair = room.chairMap[uid]
      // if(chair === undefined){
      //   cb(false)
      //   return
      // }
      // var tmpBanker = -1
      // if(room.bankerMode == conf.MODE_BANKER_NIUNIU){
      //   tmpBanker = banker
      // }
      // frame.ready(uid,chair,player,gameState,local,local.gameBegin,tmpBanker,cb)
      cb(false)
    }
    local.readyBegin = function() {
      console.log("readyBegin")
      //准备开始游戏    在场玩家自动准备  离线玩家踢出
      timer = setTimeout(function() {
        for(var i = 0;i < GAME_PLAYER;i++){
          if(player[i].isActive){
            if(player[i].isOnline){
              player[i].isReady = true
            }else{
              quitRoomFun(player[i].uid,room.roomId,"notInOnline",function(argument) {})
            }
          }
        }
        //没有玩家则关闭房间
        var flag = true
        for(var index in player){
          if(player.hasOwnProperty(index)){
            if(player[index].isActive && !player[index].isRobot){
              flag = false
            }
          }
        }
        console.log("flag : "+flag)
        if(flag){
          gameOverCB(room.roomId,player,room.roomType)
        }else{
          //游戏开始
          notify = {
            "cmd" : "gameStart"
          }
          local.sendAll(notify)
          local.gameBegin()          
        }
      },8000)
    }
    //游戏开始
    local.gameBegin = function() {
      log("gameBegin")
      gameState = conf.GS_GAMEING     
      if(room.bankerMode == conf.MODE_BANKER_NIUNIU){
        if(banker !== -1){
          //重置庄家信息
          for(var i = 0;i < GAME_PLAYER;i++){
              betList[i] = 0;
              player[i].isBanker = false
          }
          //console.log("banker : "+banker)
          player[banker].isBanker = true    
        }
      }
      room.gameNumber--
      room.maxRob = 1
      //重置下注信息
      for(var i = 0;i < GAME_PLAYER;i++){
        if(player[i].isReady){
            betList[i] = 0
            player[i].isShowCard = false
          }
      }
      betAmount = 0
      //增加大牌概率，当牌型权重较低时重新洗牌
      var randTimes = 0
      var index = 0;
      //换一副新牌
      cards = {}                       //牌组
      cardCount = 0                    //卡牌剩余数量
      for(var i = 1;i <= 13;i++){
        for(var j = 0;j < 4;j++){
          cards[cardCount++] = {num : i,type : j}
        }
      }
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
        index = 0
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
            //player[i].cardsList[room.runCount] = result[i]           
          }
      }
      console.log(result)
      for(var index = 0;index < GAME_PLAYER;index++){
        var newPlayer = deepCopy(player)
        //明牌模式所有人四张牌可见  暗牌自己四张牌可见
        if(room.cardMode == conf.MODE_CARD_SHOW){
          for(var i = 0; i < GAME_PLAYER;i++){
              delete newPlayer[i].handCard[4]
          }
        }else if(room.cardMode == conf.MODE_CARD_HIDE){
          for(var i = 0; i < GAME_PLAYER;i++){
              if(i == index){
                delete newPlayer[index].handCard[4]
              }else{
                delete newPlayer[i].handCard
              }
          }
        }
        if(player[index].isActive){
          var notify = {
            "cmd" : "gameBegin",
            "player" : newPlayer
          }
          local.sendUid(player[index].uid,notify)           
        }
      }
      //TODO 下个阶段
      local.chooseBanker()
    }
    //定庄阶段  有抢庄则进入抢庄
    local.chooseBanker = function() {
      if(room.bankerMode == conf.MODE_BANKER_ROB){
        gameState = conf.GS_ROB_BANKER
        //初始化抢庄状态为-1
        for(var i = 0; i < GAME_PLAYER;i++){
          robState[i] = -1
        }
        //抢庄
        var notify = {
          "cmd" : "beginRob"
        }
        local.sendAll(notify)
        timer = setTimeout(local.endRob,conf.TID_MINGPAIQZ_ROB_TIME)         
      }else{
        local.betting()
      }
    }
    //结束抢庄
    local.endRob = function() {
      //统计抢庄人数
      var num = 0
      var robList = {}
      console.log(robState)
      var maxRob = 1
      for(var i = 0; i < GAME_PLAYER;i++){
        player[i].isBanker = false
        if(robState[i] > maxRob){
            maxRob = robState[i]
        }
      }
      for(var i = 0; i < GAME_PLAYER;i++){
        if(robState[i] >= maxRob){
          robList[num++] = i
        }
      }
      //console.log("endRob num : "+num)
      //无人抢庄将所有参与游戏的玩家加入抢庄列表
      if(num == 0){
        for(var i = 0; i < GAME_PLAYER;i++){
      //随机出一个庄家
          if(player[i].isActive && player[i].isReady){
            robList[num++] = i
          }
        }
      }
      //console.log("num : "+num)
      var index = Math.floor(Math.random() * num)%num
      //console.log("index : "+index)
      num = robList[index]
      room.maxRob = maxRob
      banker = num
      player[banker].isBanker = true
      player[banker].bankerCount++
      gameState = conf.GS_NONE
      setTimeout(local.betting,1000)
    }
    //下注阶段
    local.betting = function() {
      log("betting")
      //状态改变
      gameState = conf.GS_BETTING
      //通知客户端
      var notify = {
        cmd : "beginBetting",
        banker : banker,
        lastScore : lastScore
      }
      local.sendAll(notify)
      //定时器启动下一阶段
      timer = setTimeout(local.deal,conf.TID_BETTING)      
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
    //开牌
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
        if(player[i].isReady && player[i].isShowCard == false){
          flag = false
        }
      }

      if(flag){
        clearTimeout(timer)
        local.settlement()
      }
      cb(true)
    }
    //玩家操作
    room.handle.useCmd = function(uid,sid,param,cb) {
      var chair = room.chairMap[uid]
      if(chair === undefined){
        cb(false)
        return
      }
      switch(param.cmd){
          case "robBanker" :
            if(gameState !== conf.GS_ROB_BANKER){
              cb(false)
              return
            } 
            if(!param || typeof(param.num) !== "number" || param.num < 0 || param.num > 4){
              cb(false)
              return
            }
            log("robBanker")
            console.log(robState)
            //判断是否已抢庄
            if(robState[chair] != -1){
              cb(false)
              return
            }
            console.log(1111111111)
            //记录抢庄
            robState[chair] = param.num
           
            var notify = {
              "cmd" : "robBanker",
              "chair" : chair,
              "num" : robState[chair]
            }
            local.sendAll(notify)
            cb(true)
            //判断所有人都已操作进入下个阶段
            var flag = true
            for(var index in robState){
              if(robState.hasOwnProperty(index)){
                if(player[index].isActive){
                  if(robState[index] == -1){
                    flag = false
                  }
                }
              }
            }
            if(flag){
              clearTimeout(timer)
              local.endRob()
            }            
            return
          case "bet" : 
            //游戏状态为BETTING
            if(gameState !== conf.GS_BETTING){
              console.log("bet1")
              cb(false)
              return
            }
            //不在游戏中不能下注
            if(!player[chair].isReady){
              console.log("bet2")
              cb(false)
              return
            }  
            //庄家不能下注
            if(chair == banker){
              console.log("bet3")
              cb(false)
              return
            }
            //已下注不能下注
            if(betList[chair] !== 0){
              console.log("bet4")
              cb(false)
              return
            }
            //下注只能下底分或底分两倍
            if(!param || typeof(param.bet) !== "number" || (param.bet !== basic && param.bet !== 2 * basic)){
              console.log("bet5 " +param.bet)
              cb(false)
              return
            }
            betList[chair] += param.bet
            betAmount += param.bet
            local.betMessege(chair,param.bet)
            local.isAllBet()
            cb(true)
            return
        case "allIn" :
            //推注
            if(gameState !== conf.GS_BETTING){
              cb(false)
              return
            }
            //本局游戏不允许推注不能推注
            if(!allowAllin){
              cb(false)
              return
            }
            //庄家不能下注
            if(chair == banker){
              cb(false)
              return
            }
            //已下注不能下注
            if(betList[chair] !== 0){
              cb(false)
              return
            }
            //上一局赢了才能推注              
            if(lastScore[chair] <= 0){
              cb(false)
              return
            }
            var tmpBet = basic + lastScore[chair]
            var maxBet = basic * 4
            if(tmpBet > maxBet){
              tmpBet = maxBet
            }
            betList[chair] += tmpBet
            local.betMessege(chair,tmpBet)
            local.isAllBet()
            cb(true)
            return
      }
      cb(false)
  }
  local.isAllBet = function() {
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
  local.deal = function(){
      log("deal")
      gameState = conf.GS_DEAL
      //若玩家未下注默认下底分
      //默认底分
      for(var i = 0; i < GAME_PLAYER;i++){
          if(player[i].isReady && player[i].isActive && i != banker && betList[i] == 0){
            betList[i] = basic
            local.betMessege(i,basic)  
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
        gameState = conf.GS_FREE
        local.settlement()
      },conf.TID_SETTLEMENT)
  }    
    //结算
    local.settlement = function() {
      if(gameState !== conf.GS_SETTLEMENT){
        gameState = conf.GS_FREE
        room.runCount++
        readyCount = 0
        clearTimeout(timer)
        console.log("settlemnt")

        var curScores = new Array(GAME_PLAYER)
        for(var i = 0;i < GAME_PLAYER;i++){
          curScores[i] = 0
        }
        //TODO 积分计算
        for(var i = 0;i < GAME_PLAYER;i++){
          if(player[i].isActive && player[i].isReady){
              if(i === banker || player[i].isReady != true) continue
              //比较大小
              if(logic.compare(result[i],result[banker])){
                  //闲家赢
                  var tmpScore = betList[i] * result[i].award * room.maxRob
                  curScores[banker] -= tmpScore
                  curScores[i] += tmpScore
                  console.log("tmpScore : "+tmpScore)
                  console.log("betList[i] : "+betList[i])
                  console.log("result[i].award : "+result[i].award)
                  console.log("room.maxRob : "+room.maxRob)
                  console.log(curScores)
              }else{
                  //庄家赢
                  var tmpScore = betList[i] * result[banker].award * room.maxRob
                  //闲家输的钱不能大于自身金钱
                  if(player[i].score < tmpScore){
                    tmpScore = player[i].score
                  }
                  curScores[i] -= tmpScore
                  curScores[banker] += tmpScore
                  console.log("tmpScore : "+tmpScore)
                  console.log("betList[i] : "+betList[i])
                  console.log("result[banker].award : "+result[banker].award)
                  console.log("room.maxRob : "+room.maxRob)
                  console.log(curScores)
              }
          }
        }
        //庄家输的钱不能大于自身金钱
        if(curScores[banker] < 0 && player[banker].score + curScores[banker] < 0){
          console.log(curScores)
          console.log("banker : "+banker)
          var tmpScore = -(curScores[banker] + player[banker].score)
          //console.log("tmpScore : "+tmpScore)
          while(tmpScore > 0){
            //找到牌型最小且赢的玩家
            var tmpMin = -1
            for(var i = 0;i < GAME_PLAYER;i++){
              if(player[i].isReady && i != banker && curScores[i] > 0 && (tmpMin == -1 || logic.compare(result[tmpMin],result[i]))){
                  tmpMin = i
              }
            }
            console.log("tmpMin : "+tmpMin + "    tmpScore : "+tmpScore)
            if(tmpMin == -1){
              console.log(player)
              console.log(result)
            }
            if(curScores[tmpMin] > 0){
              if(curScores[tmpMin] >= tmpScore){
                curScores[tmpMin] -= tmpScore
                curScores[banker] += tmpScore
                tmpScore = 0
              }else{
                curScores[banker] += curScores[tmpMin]
                tmpScore -= curScores[tmpMin]
                curScores[tmpMin] = 0
              }
            }
          }
          console.log(curScores)
        }
        //牛牛坐庄模式换庄
        //room.maxResultFlag = false
        var maxResultFlag = false
        var maxResultIndex = -1
        if(room.bankerMode == conf.MODE_BANKER_NIUNIU){
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
            //room.maxResultFlag = true
          }
        }        
        //积分改变
        for(var i = 0;i < GAME_PLAYER;i++){
            if(curScores[i] != 0){
              local.changeScore(i,curScores[i])
            }
            lastScore[i] = curScores[i]
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
        for(var i = 0;i < GAME_PLAYER; i++){
            player[i].isReady = false
            player[i].isNoGiveUp = true
            player[i].isShowCard = false
        }
        //金币场小结算
        settlementCB(room.roomId,curScores,player,room.roomType)
        local.readyBegin()
      }
    }
    room.gameOver = function() {
      clearTimeout(timer)
      //总结算
      room.state = true

      // var notify = {
      //   "cmd" : "gameOver",
      //   "player" : player
      // }
      // local.sendAll(notify)
      // room.endTime = (new Date()).valueOf()
      var tmpscores = {}
      for(var i = 0; i < GAME_PLAYER;i++){
        if(player[i].isActive){
          tmpscores[player[i].uid] = player[i].score
          if(player[i].isRobot){
            robots[i].destroy()
          }
        }
      }
      // room.scores = tmpscores
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
    //玩家重连
    room.reconnection = function(uid,sid,cb) {
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
        surplusGameNumber : room.maxGameNumber - room.gameNumber
      }
      if(notify.state === conf.GS_NONE){
        notify.state = conf.GS_ROB_BANKER
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
      player[chair].score = 0                 //当前金币
      player[chair].ip  = undefined           //玩家ip地址
      player[chair].isRobot = undefined       //是否为机器人        
      player[chair].cardsList = {}            //手牌记录
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
        if(room.bankerMode == conf.MODE_BANKER_NIUNIU && banker == chair){
          return
        }
        //frame.disconnect(chair,player,gameState,local,local.gameBegin)
      }
    }
    //积分改变
    local.changeScore = function(chair,score) {
          player[chair].score = parseInt(player[chair].score) + parseInt(score)  
    }

    //广播消息
    local.sendAll = function(notify) {
      room.channel.pushMessage('onMessage',notify)
      //发送给机器人
      for(var i = 0;i < GAME_PLAYER;i++){
        if(player[i].isActive && player[i].isRobot){
          robots[i].receive(player[i].uid,notify)
        }
      }
    }

    //通过uid 单播消息
    local.sendUid = function(uid,notify) {
      var chair = room.chairMap[uid]
      if(player[chair].isRobot){
        robots[chair].receive(uid,notify)
      }else{
        if(room.channel.getMember(uid)){
            var tsid =  room.channel.getMember(uid)['sid']
            channelService.pushMessageByUids('onMessage', notify, [{
              uid: uid,
              sid: tsid
            }]);  
        }        
      }

    }
    local.getRoomInfo = function(chair) {
      var newPlayer = deepCopy(player)
      //明牌模式所有人四张牌可见  暗牌自己四张牌可见
      if(gameState !== conf.GS_DEAL && gameState !== conf.GS_SETTLEMENT){
        if(room.cardMode == conf.MODE_CARD_SHOW){
          for(var i = 0; i < GAME_PLAYER;i++){
              delete newPlayer[i].handCard[4]
          }
        }else if(room.cardMode == conf.MODE_CARD_HIDE){
          for(var i = 0; i < GAME_PLAYER;i++){
              if(i == chair){
                delete newPlayer[chair].handCard[4]
              }else{
                delete newPlayer[i].handCard
              }
          }
        }
      }
      var notify = {
        cmd : "roomPlayer",
        player:newPlayer,
        gameMode : room.gameMode,
        maxGameNumber : room.maxGameNumber,
        gameNumber : room.maxGameNumber - room.gameNumber,
        consumeMode : room.consumeMode,
        cardMode : room.cardMode,
        roomId : room.roomId,
        betList : betList,
        state : gameState,
        roomType : room.roomType,
        basic : basic,
        maxRob : room.maxRob,
        lastScore : lastScore,
        TID_ROB_TIME : conf.TID_MINGPAIQZ_ROB_TIME,
        TID_BETTING : conf.TID_BETTING,
        TID_SETTLEMENT : conf.TID_SETTLEMENT,
        robState : robState,
        allowAllin : allowAllin
      }
      if(notify.state === conf.GS_NONE){
        notify.state = conf.GS_ROB_BANKER
      }
      return notify
    }
  //用户退出
  room.userQuit = function(uid,cb){
    //空闲时间才可退出
    if(gameState !== conf.GS_FREE){
      cb(false)
      return
    }
    var chair = room.chairMap[uid]
    if(chair === undefined){
      cb(false)
      return
    }    
    //清除座位信息
    if(!player[chair].isRobot){
      var tsid =  room.channel.getMember(uid)['sid']
      if(tsid){
        room.channel.leave(uid,tsid)
      }
    }else{
      robots[chair].destroy()
    }
    delete room.chairMap[uid]
    var notify = {
      cmd: "userQuit",
      uid: uid,
      chair : chair
    }
    local.sendAll(notify)
    local.initChairInfo(chair)
    cb(true,uid)
  }
  //房间是否空闲
  room.isFree = function(){
    return gameState === conf.GS_FREE
  }
  return room 
}


var log = function(str) {
     console.log("LOG NiuNiu : "+str)
}
var deepCopy = function(source) { 
  var result={}
  for (var key in source) {
        result[key] = typeof source[key]==="object"? deepCopy(source[key]): source[key]
     } 
  return result;
}



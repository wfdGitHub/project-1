var COMB_TYPE_NONE  =    0           // 牛破
var COMB_TYPE_OX1   =    1           // 牛1
var COMB_TYPE_OX2   =    2           // 牛2
var COMB_TYPE_OX3   =    3           // 牛3
var COMB_TYPE_OX4   =    4           // 牛4
var COMB_TYPE_OX5   =    5           // 牛5
var COMB_TYPE_OX6   =    6           // 牛6
var COMB_TYPE_OX7   =    7           // 牛7   
var COMB_TYPE_OX8   =    8           // 牛8   
var COMB_TYPE_OX9   =    9           // 牛9   
var COMB_TYPE_OX10  =    10          // 牛牛  
var COMB_TYPE_YIN_DELUX =    11      // 银花牛
var COMB_TYPE_JIN_DELUX =    12      // 金花牛
var COMB_TYPE_SHUN = 13              // 顺子
var COMB_TYPE_TONGHUA = 14           // 同花
var COMB_TYPE_HULU = 15              // 葫芦
var COMB_TYPE_BOMB  =    16          // 炸弹
var COMB_TYPE_MICRO =    17          // 五小
var COMB_TYPE_TONGHUASHUN = 18       // 同花顺

var awardList = {
  "0" : 1,
  "1" : 1,
  "2" : 1,
  "3" : 1,
  "4" : 1,
  "5" : 1,
  "6" : 1,
  "7" : 1,
  "8" : 2,
  "9" : 3,
  "10" : 4,
  "11" : 5,
  "12" : 6,
  "13" : 6,
  "14" : 6,
  "15" : 6,
  "16" : 7,
  "17" : 8,
  "18" : 8
}

module.exports.getType = function(handCard) {
      //type 特殊类型  0:无;  1 : 牛牛; : 2 : 五花; 3 : 五小;4 : 炸弹;
      var result = {
        "type" : 0,
        "card" : {},
        "award": 1,
        "Comb" : {}
      }
      //先找出最大的单张牌
      result.card = handCard[0]
      for(var i = 1;i < 5;i++){
          if(handCard[i].num > result.card.num || (handCard[i].num == result.card.num && handCard[i].type > result.card.type)){
              result.card = handCard[i]
          }
      }
      var shunFlag = true
      var tonghuaFlag = true
      var tmpHandCard = deepCopy(handCard)

      for(var i = 0;i < 5;i++){
        for(var j = i+1; j < 5;j++){
          if(tmpHandCard[i].num > tmpHandCard[j].num || (tmpHandCard[i].num == tmpHandCard[j].num && tmpHandCard[i].type > tmpHandCard[j].type)){
            var tmpCard = tmpHandCard[i]
            tmpHandCard[i] = tmpHandCard[j]
            tmpHandCard[j] = tmpCard
          }
        }
      }
      //判断顺子
      for(var i = 0;i < 4;i++){
        if(tmpHandCard[i].num !== (tmpHandCard[i+1].num - 1)){
          shunFlag = false
          break
        }
      }
      //判断同花
      for(var i = 0;i < 4;i++){
        if(tmpHandCard[i].type !== tmpHandCard[i+1].type){
          tonghuaFlag = false
          break
        }
      }
      //同花顺
      if(shunFlag && tonghuaFlag){
          result.type = COMB_TYPE_TONGHUASHUN
          result.award = awardList[result.type]
          for(var i = 1;i < 5;i++){
              if(tmpHandCard[i].num > result.card.num || (tmpHandCard[i].num == result.card.num && tmpHandCard[i].type > result.card.type)){
                  result.card = tmpHandCard[i]
              }
          }          
          return result        
      }
      //五小牛
      if((handCard[0].num + handCard[1].num + handCard[2].num + handCard[3].num + handCard[4].num) <= 10){
          result.type = COMB_TYPE_MICRO
          result.award = awardList[result.type]
          return result
      }      
      //炸弹
      var count = 0
      for(var i = 0;i < 5;i++){
        count = 1
        for(var j = 0;j < 5;j++){
          if(i != j && handCard[i].num === handCard[j].num){
              count++
          }
        }
        if(count === 4){
          result.type = COMB_TYPE_BOMB
          result.card = handCard[i]
          result.award = awardList[result.type]
          return result
        }
      }
      var huluFlag = false
      //葫芦
      if(tmpHandCard[0].num === tmpHandCard[1].num && tmpHandCard[0].num === tmpHandCard[2].num){
        if(tmpHandCard[3].num === tmpHandCard[4].num){
          result.card = tmpHandCard[0]
          huluFlag = true
        }
      }
      if(tmpHandCard[0].num === tmpHandCard[1].num){
        if(tmpHandCard[2].num === tmpHandCard[3].num && tmpHandCard[3].num === tmpHandCard[4].num){
           result.card = tmpHandCard[2]
          huluFlag = true
        }
      }      
      if(huluFlag){
          result.type = COMB_TYPE_HULU
          result.award = awardList[result.type]
          return result        
      }
      //同花
      if(tonghuaFlag){
          result.type = COMB_TYPE_TONGHUA
          result.award = awardList[result.type]
          return result          
      }
      //顺子
      if(shunFlag){
          result.type = COMB_TYPE_SHUN
          result.award = awardList[result.type]
          for(var i = 1;i < 5;i++){
              if(tmpHandCard[i].num > result.card.num || (tmpHandCard[i].num == result.card.num && tmpHandCard[i].type > result.card.type)){
                  result.card = tmpHandCard[i]
              }
          } 
          return result          
      }
      //银花牛
      var flag = true
      var yinniuCount = 0
      for(var i = 0;i < 5;i++){
        if(handCard[i].num < 10){
          flag = false
          break
        }else if(handCard[i].num === 10){
          yinniuCount++
        }
      }
      if(flag === true && yinniuCount === 1){
          result.type = COMB_TYPE_YIN_DELUX
          result.award = awardList[result.type]
          return result 
      }
      //五花牛
      flag = true
      for(var i = 0;i < 5;i++){
        if(handCard[i].num < 11){
          flag = false
        }
      }
      if(flag === true){
          result.type = COMB_TYPE_JIN_DELUX
          result.award = awardList[result.type]
          return result
      }
      var __card_val = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 10, 10, 10, 10]
      var allComb = [
        [0,1,2,3,4],
        [0,1,3,2,4],
        [0,1,4,2,3],
        [0,2,3,1,4],
        [0,2,4,1,3],
        [0,3,4,1,2],
        [1,2,3,0,4],
        [1,2,4,0,3],
        [1,3,4,0,2],
        [2,3,4,0,1]
      ]

      for(var i=0; i<10; ++i){
          if(((__card_val[handCard[allComb[i][0]].num] + __card_val[handCard[allComb[i][1]].num] + __card_val[handCard[allComb[i][2]].num]) % 10) == 0){
              result.type = COMB_TYPE_NONE + (__card_val[handCard[allComb[i][3]].num] + __card_val[handCard[allComb[i][4]].num]) % 10
              if(result.type === 0){
                result.type = COMB_TYPE_OX10
              }
              result.award = awardList[result.type]
              result.Comb = allComb[i]
              break
          }
      }
      return result
 }

//对比手牌   返回true为第一个玩家赢，false为第二个玩家赢
module.exports.compare = function(result1,result2) {
    if(result1.type > result2.type){
        return true
    }
    if(result1.type ==  result2.type){
      //同花和同花顺先判断花色再判断点数,其他先判断点数再判断花色
      if(result1.type == COMB_TYPE_TONGHUA || result1.type == COMB_TYPE_TONGHUASHUN){
        if(result1.card.type > result2.card.type){
            return true
        }
        if(result1.card.type == result2.card.type && result1.card.num > result2.card.num){
          return true
        }
      }else{
        if(result1.card.num > result2.card.num){
            return true
        }
        if(result1.card.num == result2.card.num && result1.card.type > result2.card.type){
          return true
        }
      }
    }
    return false
}


//换牌
module.exports.changeHandCard = function(handCard,cards,endCount,flag) { 
  var tmpResult = {}
  tmpResult = module.exports.getType(handCard)
  if(flag == true){
    //换好牌
    var value = 6
    var tmpRand = Math.random()
    var times = 5
    if(tmpRand < 0.4){
      value = 7
      times = 10
    }else if(tmpRand < 0.1){
      value = 8
      times = 20
    }
    if(tmpResult.type < value){
      for(var z = 0;z < 5;z++){
        cards[endCount++] = deepCopy(handCard[z])
      }
      var randTimes = 0
      var dealFlag = false
      do{
        randTimes++
        dealFlag = false
        //洗牌
        for(var i = 0;i < endCount;i++){
          var tmpIndex = Math.floor(Math.random() * (endCount - 0.000001))
          var tmpCard = cards[i]
          cards[i] = cards[tmpIndex]
          cards[tmpIndex] = tmpCard
        }
        //发牌
        for(var i = 0; i < 5; i++){
          handCard[i] = cards[endCount - 5 + i]
        }
        tmpResult = module.exports.getType(handCard)
        if(tmpResult.type < value){
          dealFlag = true
        }
      }while(dealFlag && randTimes < times)      
    }
  }else{
    //换差牌
    var value = 5
    var tmpRand = Math.random()
    var times = 3
    if(tmpRand < 0.4){
      value = 4
      times = 4
    }else if(tmpRand < 0.1){
      value = 3
      times = 5
    }
    if(tmpResult.type > value){
      for(var z = 0;z < 5;z++){
        cards[endCount++] = deepCopy(handCard[z])
      }
      var randTimes = 0
      var dealFlag = false
      do{
        randTimes++
        dealFlag = false
        //洗牌
        for(var i = 0;i < endCount;i++){
          var tmpIndex = Math.floor(Math.random() * (endCount - 0.000001))
          var tmpCard = cards[i]
          cards[i] = cards[tmpIndex]
          cards[tmpIndex] = tmpCard
        }
        //发牌
        for(var i = 0; i < 5; i++){
          handCard[i] = cards[endCount - 5 + i]
        }
        tmpResult = module.exports.getType(handCard)
        if(tmpResult.type > value){
          dealFlag = true
        }
      }while(dealFlag && randTimes < times)      
    }
  }
}

var deepCopy = function(source) { 
  var result={}
  for (var key in source) {
        result[key] = typeof source[key]==="object"? deepCopy(source[key]): source[key]
     } 
  return result;
}

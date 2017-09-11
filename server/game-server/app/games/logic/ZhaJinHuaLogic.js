var COMB_TYPE_DAN         =   0            // 单张
var COMB_TYPE_DUI         =   1            // 对子
var COMB_TYPE_SHUN        =   2            // 顺子
var COMB_TYPE_JINHUA      =   3            // 金花
var COMB_TYPE_JINHUASHUN  =   4            // 金花顺
var COMB_TYPE_BAOZI       =   5            // 豹子

var CARD_VALUE = {
  "1" : 14,
  "2" : 2,
  "3" : 3,
  "4" : 4,
  "5" : 5,
  "6" : 6,
  "7" : 7,
  "8" : 8,
  "9" : 9,
  "10" : 10,
  "11" : 11,
  "12" : 12,
  "13" : 13
}

//获取牌型
module.exports.getType = function(handCard) {
	var result = {
		"type" : 0,              
		"card" : {}
	}
  var handCard = deepCopy(handCard)
	//先找出最大的单张牌
	result.card = handCard[0]
	for(var i = 1;i < 3;i++){
		if(CARD_VALUE[handCard[i].num] > CARD_VALUE[result.card.num]){
		  result.card = handCard[i]
		}
	}
  //同花标志
  var tongHuaFlag = false
  
  if(handCard[0].type == handCard[1].type && handCard[1].type == handCard[2].type){
    tongHuaFlag = true
  }
  //顺子标志
  //排序
  for(var i = 0;i < 3 - 1;i++){
    for(var j = i + 1; j < 3;j++){
      if(CARD_VALUE[handCard[i].num] > CARD_VALUE[handCard[j].num] || (CARD_VALUE[handCard[i].num] == CARD_VALUE[handCard[j].num] && handCard[i].type > handCard[j].type)){
        var tmpCard = deepCopy(handCard[i])
        handCard[i] = deepCopy(handCard[j])
        handCard[j] = tmpCard
      }
    }
  }
  var shunFlag = false
  if(CARD_VALUE[handCard[0].num] == CARD_VALUE[handCard[1].num] - 1 && CARD_VALUE[handCard[1].num] == CARD_VALUE[handCard[2].num] - 1){
    shunFlag = true
  }
  //豹子
  if(handCard[0].num == handCard[1].num && handCard[1].num == handCard[2].num){
    result.type = COMB_TYPE_BAOZI
    return result
  }
  //金花顺
  if(tongHuaFlag && shunFlag){
    result.type = COMB_TYPE_JINHUASHUN
    return result    
  }
  //金花
  if(tongHuaFlag){
    result.type = COMB_TYPE_JINHUA
    return result      
  }
  //顺子
   if(shunFlag){
    result.type = COMB_TYPE_SHUN
    return result      
  }
  //对子
  if(handCard[0].num == handCard[1].num){
    result.duiCard = handCard[2]
    result.type = COMB_TYPE_DUI
    return result
  }
  if(handCard[1].num == handCard[2].num){
    result.duiCard = handCard[0]
    result.type = COMB_TYPE_DUI
    return result
  }
  if(handCard[0].num == handCard[2].num){
    result.duiCard = handCard[1]
    result.type = COMB_TYPE_DUI
    return result
  }
  result.type = COMB_TYPE_DAN
  return result
}

//对比手牌   返回true为第一个玩家赢，false为第二个玩家赢
module.exports.compare = function(result1,result2) {
    if(result1.type > result2.type){
        return true
    }
    if(result1.type == result2.type && result1.card.num > result2.card.num){
        return true
    }
    if(result1.type == result2.type && result1.card.num == result2.card.num 
      && (result1.type == COMB_TYPE_DUI && result1.duiCard.num > result2.duiCard.num)){
      return true
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
      for(var z = 0;z < 3;z++){
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
        for(var i = 0; i < 3; i++){
          handCard[i] = cards[endCount - 3 + i]
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

var COMB_TYPE_NONE  =   0            // 无         0
var COMB_TYPE_OX1   =    1           // 一对8以上  1
var COMB_TYPE_OX2   =    2           // 两对       2
var COMB_TYPE_OX3   =    3           // 三条       3
var COMB_TYPE_OX4   =    4           // 顺子       5
var COMB_TYPE_OX5   =    5           // 同花       7
var COMB_TYPE_OX6   =    6           // 葫芦       10
var COMB_TYPE_OX7   =    7           // 四条       60
var COMB_TYPE_OX8   =    8           // 同花顺     150
var COMB_TYPE_OX9   =    9           // 同花大顺   250
var COMB_TYPE_OX10  =    10          // 五条       750
var awardList = [0,1,2,3,5,7,10,60,150,250,750]

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
  "13" : 13,
  "20" : 20
}
//洗牌
module.exports.shuffle = function() {
	var cards = {}					//牌组
	cardCount = 0                   //卡牌剩余数量
	for(var i = 1;i <= 13;i++){
		for(var j = 0;j < 4;j++){
		 	cards[cardCount++] = {num : i,type : j}
		}
	}
	cards[cardCount++] = {num : 20,type : 5}
	cards[cardCount++] = {num : 20,type : 6}
    //洗牌
    for(var i = 0;i < cardCount;i++){
    	var tmpIndex = Math.floor(Math.random() * (cardCount - 0.000001))
    	var tmpCard = cards[i]
    	cards[i] = cards[tmpIndex]
    	cards[tmpIndex] = tmpCard
    }
	return cards
}


//获取牌型
module.exports.getType = function(hand){
  var cardType = {
    "type" : 0,
    "award" : 0
  }

  var handCard = deepCopy(hand)
  //排序
  for(var i = 0;i < 5 - 1;i++){
    for(var j = i + 1; j < 5;j++){
      if(CARD_VALUE[handCard[i].num] > CARD_VALUE[handCard[j].num] || (CARD_VALUE[handCard[i].num] == CARD_VALUE[handCard[j].num] && handCard[i].type > handCard[j].type)){
        var tmpCard = deepCopy(handCard[i])
        handCard[i] = deepCopy(handCard[j])
        handCard[j] = tmpCard
      }
    }
  }

  //同花标志
  var tongHuaFlag = false
  if(handCard[0].type == handCard[1].type && handCard[1].type == handCard[2].type && handCard[2].type == handCard[3].type && handCard[3].type == handCard[4].type){
    tongHuaFlag = true
  }
  //顺子标志
  var shunFlag = false
  if(CARD_VALUE[handCard[0].num] == CARD_VALUE[handCard[1].num] - 1 && CARD_VALUE[handCard[1].num] == CARD_VALUE[handCard[2].num] - 1 && 
  	CARD_VALUE[handCard[2].num] == CARD_VALUE[handCard[3].num] - 1 && CARD_VALUE[handCard[3].num] == CARD_VALUE[handCard[4].num] - 1){
    shunFlag = true
  }
  //统计各个牌型数量
  var cardList = {}
  for(var i = 1;i <= 13;i++){
  	cardList[i] = 0
  }
  cardList[20] = 0
  for(var i = 0;i < 5;i++){
  	cardList[handCard[i].num]++
  }
  var wangCount = cardList[20]
  //五条
  for(var i = 1;i <= 13;i++){
    if(cardList[i] + wangCount == 5){
      cardType.type = COMB_TYPE_OX10
      cardType.award = awardList[cardType.type]
      return cardType
    }
  }
  //同花大顺
  if(shunFlag && tongHuaFlag){
    if(CARD_VALUE[handCard[0].num] == 10 && CARD_VALUE[handCard[4].num] == 14){
      cardType.type = COMB_TYPE_OX9
      cardType.award = awardList[cardType.type]
      return cardType      
    }else{
      //同花顺
      cardType.type = COMB_TYPE_OX8
      cardType.award = awardList[cardType.type]
      return cardType        
    }
  }
  //四条
  for(var i = 1;i <= 13;i++){
    if(cardList[i] + wangCount == 4){
      cardType.type = COMB_TYPE_OX7
      cardType.award = awardList[cardType.type]
      return cardType
    }
  }
  //葫芦
  var thereFlag = 0
  var twoFlag = 0
  for(var i = 1;i <= 13;i++){
    if(cardList[i] == 3){
      thereFlag++
    }
    if(cardList[i] == 2){
      twoFlag++
    }
  }
  if(thereFlag > 0 && twoFlag > 0){
    cardType.type = COMB_TYPE_OX6
    cardType.award = awardList[cardType.type]
    return cardType    
  }
  //同花
  if(tongHuaFlag){
    cardType.type = COMB_TYPE_OX5
    cardType.award = awardList[cardType.type]
    return cardType
  }
  //顺子
  if(shunFlag){
    cardType.type = COMB_TYPE_OX4
    cardType.award = awardList[cardType.type]
    return cardType
  }
  //三条
  if(thereFlag > 0){
    cardType.type = COMB_TYPE_OX3
    cardType.award = awardList[cardType.type]
    return cardType    
  }
  //两对
  if(twoFlag == 2){
    cardType.type = COMB_TYPE_OX2
    cardType.award = awardList[cardType.type]
    return cardType    
  }
  //一对8以上
  if(twoFlag > 0){
    var tmpFlag = false
    for(var i = 8;i <= 13;i++){
      if(cardList[i] == 2){
        tmpFlag = true
      }
    }
    if(cardList[1] == 2){
      tmpFlag = true
    }
    if(tmpFlag){
      cardType.type = COMB_TYPE_OX1
      cardType.award = awardList[cardType.type]
      return cardType
    }
  }
  cardType.type = COMB_TYPE_OX0
  cardType.award = awardList[cardType.type]
  return cardType
}


//换好牌


//换差牌






var deepCopy = function(source) { 
  var result={}
  for (var key in source) {
        result[key] = typeof source[key]==="object"? deepCopy(source[key]): source[key]
     } 
  return result;
}

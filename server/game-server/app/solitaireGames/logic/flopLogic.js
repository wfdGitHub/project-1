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

//洗牌
module.exports.shuffle = function() {
	var cards = {}					//牌组
	cardCount = 0                   //卡牌剩余数量
	for(var i = 1;i <= 13;i++){
		for(var j = 0;j < 4;j++){
		 	cards[cardCount++] = {num : i,type : j}
		}
	}
	cards[cardCount++] = {num : 20,type : 0}
	cards[cardCount++] = {num : 20,type : 1}
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
module.exports.getType = function(handCard){
	
}


//换好牌


//换差牌
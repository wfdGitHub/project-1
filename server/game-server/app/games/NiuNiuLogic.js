var COMB_TYPE_NONE  =   0            // 牛破
var COMB_TYPE_OX1   =    1           // 牛1
var COMB_TYPE_OX2   =    2           // 牛2
var COMB_TYPE_OX3   =    3           // 牛3
var COMB_TYPE_OX4   =    4           // 牛4
var COMB_TYPE_OX5   =    5           // 牛5
var COMB_TYPE_OX6   =    6           // 牛6
var COMB_TYPE_OX7   =    7           // 牛7   
var COMB_TYPE_OX8   =    8           // 牛8   x2
var COMB_TYPE_OX9   =    9           // 牛9   x3
var COMB_TYPE_OX10  =    10          // 牛牛  x4
var COMB_TYPE_DELUX =    11          // 五花  x5
var COMB_TYPE_MICRO =    12          // 五小  x6
var COMB_TYPE_BOMB  =    13          // 炸弹  x7

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
      //五小牛
      if((handCard[0].num + handCard[1].num + handCard[2].num + handCard[3].num + handCard[4].num) <= 10){
          result.type = COMB_TYPE_MICRO
          result.award = 6
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
          result.award = 7
          return result
        }
      }
      //五花牛
      var flag = true
      for(var i = 0;i < 5;i++){
        if(handCard[i].num < 10){
          flag = false
        }
      }
      if(flag === true){
          result.type = COMB_TYPE_DELUX
          result.award = 5
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
                result.award = 4
              }else if(result.type === 9){
                result.award = 3
              }else if(result.type === 8){
                result.award = 2
              }
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
    if(result1.type == result2.type && result1.card.num > result2.card.num){
        return true
    }
    if(result1.type == result2.type && result1.card.num == result2.card.num && result1.card.type > result2.card.type){
      return true
    }
    return false
}
 return module
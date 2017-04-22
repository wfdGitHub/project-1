
module.exports.logic = function() {
    var mudule = {}
    mudule.getType = function(handCard) {
      //type 特殊类型  0:无;  1 : 牛牛; : 2 : 五花; 3 : 五小;4 : 炸弹;
      var result = {
        "type" : 0,                       
        "card" : {},
        "award": 0
      }
      //先找出最大的单张牌
      result.card = handCard[0]
      for(var i = 1;i < 5;i++){
          if(handCard[i].num > result.card.num || (handCard[i].num == result.card.num && handCard[i].type > result.card.type)){
              result.card = handCard[i]
          }
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
          result.type = 4
          result.card = handCard[i]
          result.award = 8
          return result
        }
      }
      //五小牛
      if((handCard[0].num + handCard[1].num + handCard[2].num + handCard[3].num + handCard[4].num) <= 10){
          result.type = 3
          result.award = 5
          return result
      }
      //五花牛
      var flag = false
      for(var i = 0;i < 5;i++){
        if(handCard[i].num < 10){
          
        }
      }
      var allComb[10][5] = {
        {0,1,2,3,4},
        {0,1,3,2,4},
        {0,1,4,2,3},
        {0,2,3,1,4},
        {0,2,4,1,3},
        {0,3,4,1,2},
        {1,2,3,0,4},
        {1,2,4,0,3},
        {1,3,4,0,2},
        {2,3,4,0,1}
      };


    }
    return mudule
 }
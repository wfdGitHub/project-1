var COMB_TYPE_NODE   =    0           // 普通
var COMB_TYPE_DUIZI  =    1           // 对子


module.exports.getType = function(handCard) {
    console.log(handCard)
    var result = {
      "type" : 0,
      "card" : {}
    }
    if(handCard[0].num == handCard[1].num){
      result.type = COMB_TYPE_DUIZI
    }
    //最大单牌
    if(handCard[0].num > handCard[1].num || (handCard[0].num == handCard[1].num && handCard[0].type > handCard[1].type)){
      result.card = handCard[0]
    }else{
      result.card = handCard[1]
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

//获取默认组牌
module.exports.getDraw = function(handCard) {
    var maxI = 0
    var maxJ = 1
    var tmpHand = {}
    tmpHand[0] = handCard[maxI]
    tmpHand[1] = handCard[maxJ]
    var maxResult = module.exports.getType(tmpHand)
    for(var i = 0;i < 3;i++){
      for(var j = i + 1;j < 4;j++){
        var tmpHand = {}
        tmpHand[0] = handCard[i]
        tmpHand[1] = handCard[j]
        var tmpResult = module.exports.getType(tmpHand)
        if(module.exports.compare(tmpResult,maxResult)){
          maxResult = tmpResult
          maxI = i
          maxJ = j
        }
      }
    }
    //maxI maxJ为尾 再找出头两张
    var list = []
    for(var i = 0;i < 4;i++){
      if(i != maxI && i != maxJ){
        list.push(i)
      }
    }
    list.push(maxI)
    list.push(maxJ)
    return list
}
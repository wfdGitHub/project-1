var crypto = require('crypto')
var http = require('http')
var https = require('https')
module.exports = {

}

var getCity = function(ip,cb) {
    var string = "http://ip.taobao.com/service/getIpInfo.php?ip="+ip
    var req=http.get(string,function(res){
        var data = data
        res.on("data",function(chunk) {
          data += chunk
        })
        res.on("end",function() {
          data = data.replace("undefined","")
          data = JSON.parse(data)
          if(cb){
            cb(data)
          }
        })
    })
    req.on('error', function(e) {
      console.error(e);
    })
}

module.exports.sendLoginHttp = function(notify) {
  //console.log(notify)
  notify.data["uid"] = notify.data["playerId"]
  var data = {}

  data.game_uid = notify.data.uid
  data.open_id = notify.openId
  data.union_id = notify.unionid
  data.nickname = notify.data.nickname
  data.head_img = notify.data.head
  data.sum_play = notify.allGames
  data.coin = notify.data.diamond
  data.ip = notify.ip.replace("::ffff:","")
  data.used_coin = notify.useDiamond
  data.gold = notify.gold
  data.platform = notify.platform

  //获取ip对应地址
  getCity(data.ip,function(tmpData) {
    if(tmpData.data){
      data.area = tmpData.data.area
      data.region = tmpData.data.region
      data.city = tmpData.data.city  
    }
    // var keys = Object.keys(data).sort()
    // var string = ""
    // for(var i = 0;i < keys.length;i++){
    //   string += ("" + keys[i] +"="+ data[keys[i]]+ "&")
    // }
    // string += "key=niuniuyiyousecretkey"
    // data.sign = md5(string)
    var req=http.request('http://pay.5d8d.com/niu_admin.php/Api/userLogin?'+require('querystring').stringify(data),function(res){
    })
    req.on("error",function(err){
      console.log(err.message)
    })
    req.end()    
  })


}

module.exports.sendDiamondHttp = function(uid,coin,diamond,type) {
  var data = {
    "game_uid" : uid,
    "coin" : coin,
    "diamond" : diamond,
    "type" : type
  }
  var keys = Object.keys(data).sort()
  var string = ""
  for(var i = 0;i < keys.length;i++){
    string += ("" + keys[i] +"="+ data[keys[i]]+ "&")
  }
  string += "key=niuniuyiyousecretkey"
  data.sign = md5(string)
  var req=http.request('http://pay.5d8d.com/niu_admin.php/api/changeUserCoin?'+require('querystring').stringify(data),function(res){

  })
  req.on("error",function(err){
    console.log(err.message)
  })
  req.end()
}

module.exports.sendGameOver = function(data) {
    delete data.matchStream
    //streamData.scores = querystring.stringify(streamData.scores)
    var keys = Object.keys(data).sort()
    var string = ""
    for(var i = 0;i < keys.length;i++){
      if(data[keys[i]]){
        string += ("" + keys[i] +"="+ data[keys[i]]+ "&")
      }
    }
    string += "key=niuniuyiyousecretkey"
    data.sign = md5(string)    
    data = JSON.stringify(data)

    var req=http.request('http://pay.5d8d.com/niu_admin.php/api/gameResultDetail?data='+data,function(res){

    })
    req.on("error",function(err){
      console.log(err.message)
    })
    req.end()    

}
var appid = "wxd72486a200bde1db"
var secret = "f3ffae2731f6c7b03880ee24abfff9ed"

module.exports.H5GetData = function(code,cb) {
    var string = "https://api.weixin.qq.com/sns/oauth2/access_token?appid="+appid
    +"&secret="+secret+"&code="+code+"&grant_type=authorization_code"
    var req=https.get(string,function(res){
        var data = data
        res.on("data",function(chunk) {
          data += chunk
        })
        res.on("end",function() {
          data = data.replace("undefined","")
          data = JSON.parse(data)
          cb(data)
        })
    })
    req.on('error', function(e) {
      console.error(e);
    })
}

function md5 (text) {
  return crypto.createHash('md5').update(text).digest('hex');
};
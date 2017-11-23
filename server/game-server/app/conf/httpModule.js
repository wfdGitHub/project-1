var crypto = require('crypto')
var http = require('http')
var https = require('https')
var errorLogger = require("pomelo-logger").getLogger("error-log");
module.exports = {

}
var access_token = ""
var jsapi_ticket = ""
var appid = "wxc0f7af4749ce7176"
var secret = "6b28b4d8efcc6ec0428aeb5f55448ff4"
var timer = false
var local = {}
module.exports.H5GetData = function(code,count,cb) {
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
      console.log("code换取token失败 : "+count+"  e: ")
      console.log(e)
      if(count > 3){
        cb(null,{"flag" : false,"err" : e})
        console.error(e);
      }else{
        module.exports.H5GetData(code,count++,cb)
      }
    })
}
module.exports.getTicket = function(cb) {
  //jsapi_ticket存在直接返回，不存在则开启获取
  if(jsapi_ticket){
    cb(null,{flag : true,"jsapi_ticket" : jsapi_ticket})
  }else{
    local.getAccess_token(cb)
    clearInterval(timer)
    timer = setInterval(local.getAccess_token,3600 * 1000)
  }
}
local.getAccess_token = function(cb) {
    var string = "https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid="+appid+"&secret="+secret
    var req=https.get(string,function(res){
        var data = data
        res.on("data",function(chunk) {
          data += chunk
        })
        res.on("end",function() {
          data = data.replace("undefined","")
          data = JSON.parse(data)
          if(data.errcode || !data.access_token){
            errorLogger.info("获取微信token失败!")
            errorLogger.info(data.errmsg)
            access_token = ""
            if(cb){
              cb(null,{flag : false})
            }
            return
          }
          access_token = data.access_token
          local.getJsapi_ticket(access_token,cb)
        })
    })
}
local.getJsapi_ticket = function(token,cb){
    var string = "https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token="+token+"&type=jsapi"
    var req=https.get(string,function(res){
        var data = data
        res.on("data",function(chunk) {
          data += chunk
        })
        res.on("end",function() {
          data = data.replace("undefined","")
          data = JSON.parse(data)
          if(data.errmsg !== "ok" || !data.ticket){
            errorLogger.info("获取微信ticket失败!")
            errorLogger.info(data.errmsg)
            jsapi_ticket = ""
            if(cb){
              cb(null,{flag : false})
            }
            return
          }
          jsapi_ticket = data.ticket
          if(cb){
            cb(null,{flag : true,"jsapi_ticket" : jsapi_ticket})
          }
        })
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
    local.sendLoginHttp(data,100)
  })
}

local.sendLoginHttp = function(data,time) {
    if(time > 100000){
      return
    }
    var req=http.request('http://pay.5d8d.com/niu_admin.php/Api/userLogin?'+require('querystring').stringify(data),function(res){
    })
    req.on("error",function(err){
      setTimeout(function() {
          local.sendLoginHttp(data,time * 10)
      },time*10)
      console.log(err.message)
    })
    req.end()
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

module.exports.coinChangeRecord = function(uid,type,diamond,roomId) {
  var data = {
    "game_uid" : uid,
    "type" : type,
    "coin" : diamond,
    "roomId" : roomId
  }
  var keys = Object.keys(data).sort()
  var string = ""
  for(var i = 0;i < keys.length;i++){
    string += ("" + keys[i] +"="+ data[keys[i]]+ "&")
  }
  string += "key=niuniuyiyousecretkey"
  data.sign = md5(string)
  var req=http.request('http://pay.5d8d.com/niu_admin.php/api/coinChangeRecord?'+require('querystring').stringify(data),function(res){
    
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


function md5 (text) {
  return crypto.createHash('md5').update(text).digest('hex');
};

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
      console.log("获取IP失败 : "+ip)
      cb({"area" : "","region" : "", "city" : ""})
      console.error(e);
    })
}
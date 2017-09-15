var async = require('async')
var userLoginLogger = require("pomelo-logger").getLogger("userLogin-log");
var httpConf = require("../../../conf/httpModule.js")
var url = require("url")
module.exports = function(app) {
  return new Handler(app)
}

var Handler = function(app) {
  this.app = app
  Handler.app = app
  this.sessionService = this.app.get('sessionService')
  this.channelService = this.app.get('channelService')
  this.gameChanel = this.channelService.getChannel("GameChannel",true)
  this.loginUser = {}
}

var handler = Handler.prototype

var version = "1.3.501&LKSADHFKASKDJLSAFDHJ"
//获取公告
handler.getNotify = function(msg,session,next) {
  var self = this
  self.app.rpc.db.remote.getNotify(session,function(data) {
      next(null,data)
  })
}
handler.getTicket = function(msg,session,next) {
  //获取微信ticket
  httpConf.getTicket(next)
}
handler.getLoginFlag = function(msg,session,next) {
  next(null,true)
}
//获取代开房记录
handler.getAgencyRoom = function(msg,session,next) {
    var uid = session.get("uid")
    if(!uid){
      next(null,{"flag" : false})
    }else{
      this.app.rpc.game.remote.getAgencyRoom(session,uid,function(data) {
        next(null,data)
      })      
    }
}
//获取自身数据
handler.getSelfData = function(msg,session,next) {
    var self = this
    if(session.get("uid")){
       self.app.rpc.db.remote.getPlayerInfo(session,session.get("uid"),function(data) {
          var notify = {
            cmd : "userInfo",
            data : data
          }
          next(null,notify)
      })     
     }else{
      next(false)
     }
}

// handler.test = function(msg,session,next) {
//   var notify = {
//     "cmd" : "broadcast",
//     "content" : "恭喜玩家47抽中了幸运大奖！价值499万美元法拉利一辆"
//   }
//   this.gameChanel.pushMessage('onNotify',notify)
//   next()
// }
//游客登录
handler.visitorEnter = function(msg, session, next) {
  var self = this
  var sessionService = self.app.get('sessionService')
  var userId = msg.uid //微信ID
  var playerId = userId  //玩家ID
  var notify = {}
  var result = {}
  async.waterfall([
      function(cb) {
        if(userId != undefined){
          cb()
        }else{
          self.app.rpc.db.remote.getPlayerId(session,function(uid) {
              //console.log("uid : "+uid)
              playerId = parseInt(uid) + 1
              userId = parseInt(uid) + 1
              cb()
          })
        }
      },
      function(cb){
        result.openId = playerId
        result.sex = 1
        result.head = ""
        result.nickname = "游客"+playerId
        result.headimgurl = ""
        result.uid = playerId
        result.unionid = playerId
        //console.log(result)
        self.app.rpc.db.remote.check(session,result,function(flag){
            if(flag === false){
              self.app.rpc.db.remote.setValue(session,result.uid,"diamond",200,function(argument) {})
            }
            cb(null)
        })
      },
      function(cb) {
        self.app.rpc.db.remote.getPlayerInfo(session,userId,function(data) {
          notify.cmd = "userInfo"
          notify.data = data
          notify.data.nickname = strReplace(notify.data.nickname)
          // console.log("===========")
          // console.log(data)
          //判断账号是否冻结
          if(data.freeze == 1){
            next(null,{"flag" : false,"code" : 500})
            return
          }
          //保存session
          playerId = data.playerId
          if( !! sessionService.getByUid(playerId)) {
            sessionService.kickBySessionId(sessionService.getByUid(playerId)[0].id)
          }
          session.bind(playerId)
          session.set("uid", playerId)
          session.push("uid", function(err) {
            if(err) {
              console.error('set uid for session service failed! error is : %j', err.stack)
            }
          })
          //console.log("uid : "+session.get("uid"))
          session.set("nickname",data.nickname)
          session.push("nickname", function(err) {
            if(err) {
              console.error('set nickname for session service failed! error is : %j', err.stack)
            }
          })
          //connect服务器ID
          session.set("cid", self.app.get('serverId'))
          session.push("cid", function(err) {
            if(err) {
              console.error('set cid for session service failed! error is : %j', err.stack)
            }
          })
          //console.log("nickname : "+session.get("nickname"))
          session.on('closed', onUserLeave.bind(null,self))

          cb(null)        
        })
      },
      function(cb){
        self.app.rpc.game.remote.reconnection(session,playerId,self.app.get('serverId'),function(data) {
            if(data){
              notify.reconnection = data
            }
            cb(null)
        })
      },
      function() {
        if(!self.gameChanel.getMember(playerId)){
          self.gameChanel.add(playerId,self.app.get('serverId'))
        }
        self.channelService.pushMessageByUids('onMessage', notify, [{
          uid: playerId,
          sid: self.app.get('serverId')
        }])
        var info = "visitorEnter    uid : "+playerId+"    name ： "+session.get("nickname")
        userLoginLogger.info(info)    
        //通知gameServer
        self.app.rpc.game.remote.userConnect(session,playerId,self.app.get('serverId'),function() {})            
      }
      ],
    function(err,result) {
      console.log("enter error")
      console.log(err)
      console.log(result)
      next(null,{"flag" : false,code : -200})
      return
    }
  )
  next(null,{"flag" : true})
}
//H5登录
handler.h5Enter = function(msg,session,next) {
  if(!msg.code || typeof(msg.code) !== "string"){
    next(false)
    return
  }
  var self = this
  httpConf.H5GetData(msg.code,0,function(data) {
    if(data.errcode){
      console.log(data.errmsg)
      next(null,{"flag" : false , "err" : data.errmsg})
      return
    }
    msg.openId = data.data.open_id
    msg.token = data.data.access_token
    var enterFun = handler.enter.bind(self)
    enterFun(msg,session,next)
  })
}
//登录
handler.enter = function(msg, session, next) {
  var self = this
  var openId = msg.openId
  var token = msg.token
  var sessionService = self.app.get('sessionService')
  if(!openId || !token){
    next(null,{flag : false,code: -100})
    return
  }
  if(!msg.version || msg.version !== version){
    next(null,{flag : false,code : -120})
    return
  }
  //登陆验证
  var userId = 0    //微信ID
  var playerId = 0  //玩家ID
  var notify = {}
  async.waterfall([
      function(cb) {
        self.app.rpc.login.remote.checkUser(session, {"openId" : openId,"token" : token},function(result){
            if(result == false){
                cb(false)
            }else{
              cb(null,result)
            }
        })        
      },
      function(result,cb){
        //console.log(result)
        userId = result.unionid
        if(!userId){
          next(null,{"flag" : false , "code" : -300})
          return
        }
        result.nickname = strReplace(result.nickname)
        self.app.rpc.db.remote.check(session,result,function(flag){
            cb(null)
        })
      },
      function(cb) {
        self.app.rpc.db.remote.getPlayerInfo(session,userId,function(data) {
          //console.log(data)
          notify.cmd = "userInfo"
          notify.data = data
          notify.data.nickname = strReplace(notify.data.nickname)
          notify.openId = openId
          notify.unionid = userId
          notify.allGames = data.history ? data.history.allGames : 0
          notify.ip = sessionService.getClientAddressBySessionId(session.id).ip
          notify.useDiamond = data.useDiamond
          notify.gold = data.gold
          notify.platform  = msg.platform
          if(data.freeze == 1){
            next(null,{"flag" : false ,"code" : 500})
            return
          }
          //保存session
          playerId = data.playerId
          //踢出之前用户
          if( !! sessionService.getByUid(playerId)) {
            sessionService.kickBySessionId(sessionService.getByUid(playerId)[0].id)
          }
          session.bind(playerId)
          session.set("uid", playerId)
          session.push("uid", function(err) {
            if(err) {
              console.error('set uid for session service failed! error is : %j', err.stack)
            }
          })
          session.set("nickname",data.nickname)
          session.push("nickname", function(err) {
            if(err) {
              console.error('set nickname for session service failed! error is : %j', err.stack)
            }
          })
          //connect服务器ID
          session.set("cid", self.app.get('serverId'))
          session.push("cid", function(err) {
            if(err) {
              console.error('set cid for session service failed! error is : %j', err.stack)
            }
          })
          // console.log("uid : "+session.get("uid"))
          // console.log("nickname : "+session.get("nickname"))
          session.on('closed', onUserLeave.bind(null,self))

          cb(null)        
        })
      },
      function(cb){
        self.app.rpc.game.remote.reconnection(session,playerId,self.app.get('serverId'),function(data) {
            if(data){
              notify.reconnection = data
            }
            cb(null)
        })
      },
      function() {
        if(!self.gameChanel.getMember(playerId)){
          self.gameChanel.add(playerId,self.app.get('serverId'))
        }
        self.channelService.pushMessageByUids('onMessage', notify, [{
          uid: playerId,
          sid: self.app.get('serverId')
        }])
        httpConf.sendLoginHttp(notify)
        var info = "    uid : "+playerId+"    name ： "+session.get("nickname")
        userLoginLogger.info(info)
        //通知gameServer
        self.app.rpc.game.remote.userConnect(session,playerId,self.app.get('serverId'),function() {})
      }
      ],
    function(err,result) {
      console.log("enter error")
      console.log(err)
      console.log(result)
      next(null,{"flag" : false,code : -200})
      return
    }
  )
  next(null,{"flag" : true})
}

//接受客户端发送数据
handler.sendData = function(msg, session, next){
    console.log("code : "+msg.code)
    var self = this
    //判断登录
    var uid = session.get("uid")
    //console.log("uid : "+uid)  
    if(!!uid){
        if(msg.code == "join" || msg.code == "newRoom"){
          if(msg.params){
            msg.params.ip = this.sessionService.getClientAddressBySessionId(session.id).ip   
          }
        }
        self.app.rpc.game.remote.receive(session, uid, self.app.get('serverId'), msg.code,msg.params, function(flag,msg){
            next(null,{flag : flag,msg : msg})
        }) 
    }else{
        next(null,{flag : false})
    }
}

handler.sendFrame = function(msg, session, next) {
    //console.log("code : "+msg.code)
    var self = this
    //判断登录
    var uid = session.get("uid")
    //console.log("uid : "+uid)  
    if(!!uid){
        self.app.rpc.game.remote.onFrame(session, uid, self.app.get('serverId'), msg.code,msg.params, function(flag,msg){
            next(null,{flag : flag,msg : msg})
        })   
    }else{
        next(null,{flag : false})
    }
}
//用户离开事件处理
var onUserLeave = function(self, session) {
  //console.log(self)
  //console.log(session.uid)
  //console.log(session)
  if(!session || !session.uid) {
    return
  }
  self.gameChanel.leave(session.uid,self.app.get('serverId'))
  self.app.rpc.game.remote.kick(session,session.uid,null)
}


var strReplace = function(str) {
  if(!str){
    return ""
  }
  var strArr = str.split(""),
      result = "",
      totalLen = 0;

  for(var idx = 0; idx < strArr.length; idx ++) {
      // 超出长度,退出程序
      if(totalLen >= 16) break;
      var val = strArr[idx];
      // 英文,增加长度1
      if(/[a-zA-Z]/.test(val)) {
          totalLen = 1 + (+totalLen);
          result += val;
      }
      // 中文,增加长度2
      else if(/[\u4e00-\u9fa5]/.test(val)) {
          totalLen = 2 + (+totalLen);
          result += val;
      }
      // 遇到代理字符,将其转换为 "口", 不增加长度
      else if(/[\ud800-\udfff]/.test(val)) {
          // 代理对长度为2,
          if(/[\ud800-\udfff]/.test(strArr[idx + 1])) {
              // 跳过下一个
              idx ++;
          }
          // 将代理对替换为 "口"
          result += "口";
      }else{
        result += val
      }
  }
  return result
}
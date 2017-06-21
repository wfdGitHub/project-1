var async = require('async')
var http = require('http')
var userLoginLogger = require("pomelo-logger").getLogger("userLogin-log");
var crypto = require('crypto');
var url = require("url")
module.exports = function(app) {
  return new Handler(app)
}

var Handler = function(app) {
  this.app = app
  this.sessionService = this.app.get('sessionService')
  this.channelService = this.app.get('channelService')
  this.gameChanel = this.channelService.getChannel("GameChannel",true)
  this.loginUser = {}
}

var handler = Handler.prototype

var version = "0.9.0&lakjdshajdhsakjsdjkakdadakjsd"
//获取公告
handler.getNotify = function(msg,session,next) {
  var self = this
  self.app.rpc.db.remote.getNotify(session,function(data) {
      next(null,data)
  })
}
//获取版本号
handler.getVersion = function(msg,session,next) {
      next(null,version)
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
            cb(null)
        })
      },
      function(cb) {
        self.app.rpc.db.remote.getPlayerInfo(session,userId,function(data) {
          notify.cmd = "userInfo"
          notify.data = data
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
          session.set("nickname",data.nickname)
          session.push("uid", function(err) {
            if(err) {
              console.error('set uid for session service failed! error is : %j', err.stack)
            }
          })
          //console.log("uid : "+session.get("uid"))
          session.push("nickname", function(err) {
            if(err) {
              console.error('set nickname for session service failed! error is : %j', err.stack)
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
          sid: "connector-server-1"
        }])
        var info = "visitorEnter    uid : "+playerId+"    name ： "+session.get("nickname")
        userLoginLogger.info(info)        
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
//登录
handler.enter = function(msg, session, next) {
  var self = this
  var openId = msg.openId
  var token = msg.token
  var sessionService = self.app.get('sessionService')
  if(!openId || !token){
    next(null,{code: -100})
    return
  }
  if(!msg.version || msg.version !== version){
    next(null,{code : -120})
    return
  }
  //duplicate log in
  
  // async.waterfall([

  //     function(cb) { console.log('1.1.1: ', 'start'); cb(null, 3); },

  //     function(n, cb) { console.log('1.1.2: ',n); cb(null,n, cb); },

  //     function(n, cb) { console.log('1.1.3: ',n);}

  // ], function (err, result) {

  //     console.log('1.1 err: ', err);

  //     console.log('1.1 result: ', result);

  // });
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
        self.app.rpc.db.remote.check(session,result,function(flag){
            cb(null)
        })
      },
      function(cb) {
        self.app.rpc.db.remote.getPlayerInfo(session,userId,function(data) {
          notify.cmd = "userInfo"
          notify.data = data
          notify.openId = openId
          notify.unionid = userId
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
          session.set("nickname",data.nickname)
          session.push("uid", function(err) {
            if(err) {
              console.error('set uid for session service failed! error is : %j', err.stack)
            }
          })
          session.push("nickname", function(err) {
            if(err) {
              console.error('set nickname for session service failed! error is : %j', err.stack)
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
          sid: "connector-server-1"
        }])
        sendHttp(notify)
        var info = "    uid : "+playerId+"    name ： "+session.get("nickname")
        userLoginLogger.info(info)
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
    //console.log("code : "+msg.code)
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


var sendHttp = function(notify) {
  notify.data["uid"] = notify.data["playerId"]
  var data = {}

  data.game_uid = notify.data.uid
  data.open_id = notify.openId
  data.union_id = notify.unionid
  data.nickname = notify.data.nickname
  data.head_img = notify.data.head
  data.sum_play = 0
  data.coin = notify.data.diamond
  data.used_coin = 0

  var keys = Object.keys(data).sort()
  var string = ""
  for(var i = 0;i < keys.length;i++){
    string += ("" + keys[i] +"="+ data[keys[i]]+ "&")
  }
  string += "key=niuniuyiyousecretkey"
  data.sign = md5(string)
  var req=http.request('http://pay.5d8d.com/niu_admin.php/Api/userLogin?'+require('querystring').stringify(data),function(res){

  })
  req.on("error",function(err){
    console.log(err.message)
  })
  req.end()

}

function md5 (text) {
  return crypto.createHash('md5').update(text).digest('hex');
};
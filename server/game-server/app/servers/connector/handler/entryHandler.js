var async = require('async');
module.exports = function(app) {
  return new Handler(app);
};

var Handler = function(app) {
  this.app = app;
  this.sessionService = this.app.get('sessionService');
  this.channelService = this.app.get('channelService');
  this.gameChanel = this.channelService.getChannel("GameChannel",true)
  this.loginUser = {};
};

var handler = Handler.prototype;

//获取公告
handler.getNotify = function(msg,session,next) {
  var self = this;
  self.app.rpc.db.remote.getNotify(session,function(data) {
      next(null,data)
  })
}

//获取自身数据
handler.getSelfData = function(msg,session,next) {
    var self = this;
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

handler.test = function(msg,session,next) {
  var notify = {
    "cmd" : "broadcast",
    "content" : "恭喜玩家47抽中了幸运大奖！价值499万美元法拉利一辆"
  }
  this.gameChanel.pushMessage('onNotify',notify)
  next()
}
//游客登录
handler.visitorEnter = function(msg, session, next) {
  var self = this;
  var sessionService = self.app.get('sessionService');
  var userId = msg.uid
  var notify = {}
  var result = {}
  async.waterfall([
      function(cb) {
        if(userId != undefined){
          cb()
        }else{
          self.app.rpc.db.remote.getPlayerId(session,function(uid) {
              console.log("uid : "+uid)
              userId = parseInt(uid) + 1
              cb()
          })
        }
      },
      function(cb){
        result.openId = userId
        result.sex = 1
        result.head = null
        result.nickname = "游客"+userId
        result.headimgurl = null
        result.uid = userId
        result.unionid = userId
        console.log(result)
        self.app.rpc.db.remote.check(session,result,function(flag){
            cb(null)
        })
      },
      function(cb) {
        self.app.rpc.db.remote.getPlayerInfo(session,userId,function(data) {
          notify.cmd = "userInfo"
          notify.data = data
          //保存session
          if( !! sessionService.getByUid(userId)) {
            next(null, {
              code: 500,
              error: true
            });
            return;
          }
          session.bind(userId);
          session.set("uid", userId);
          session.push("uid", function(err) {
            if(err) {
              console.error('set uid for session service failed! error is : %j', err.stack);
            }
          });
          console.log("uid : "+session.get("uid"))
          session.on('closed', onUserLeave.bind(null,self));

          cb(null)        
        })
      },
      function(cb){
        self.app.rpc.game.remote.reconnection(session,userId,self.app.get('serverId'),function(data) {
            if(data){
              notify.reconnection = data
            }
            cb(null)
        })
      },
      function() {
        self.gameChanel.add(userId,self.app.get('serverId'))
        self.channelService.pushMessageByUids('onMessage', notify, [{
          uid: userId,
          sid: "connector-server-1"
        }]);
      }
      ],
    function(err,result) {
      console.log("enter error")
      console.log(err)
      console.log(result)
      next(null,{code : -200})
      return
    }
  )
  next(null, {
      code: 100
  });  
}
//登录
handler.enter = function(msg, session, next) {
  var self = this;
  var openId = msg.openId
  var token = msg.token
  var sessionService = self.app.get('sessionService');

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
  var userId = 0
  var notify = {}
  async.waterfall([
      function(cb) {
        self.app.rpc.login.remote.checkUser(session, {"openId" : openId,"token" : token},function(result){
            if(result == false){
                cb(true)
            }else{
              cb(null,result)
            }
        })        
      },
      function(result,cb){
        console.log(result)
        userId = result.unionid
        self.app.rpc.db.remote.check(session,result,function(flag){
            cb(null)
        })
      },
      function(cb) {
        self.app.rpc.db.remote.getPlayerInfo(session,userId,function(data) {
          notify.cmd = "userInfo"
          notify.data = data
          //保存session
          if( !! sessionService.getByUid(userId)) {
            next(null, {
              code: 500,
              error: true
            });
            return;
          }
          session.bind(userId);
          session.set("uid", userId);
          session.push("uid", function(err) {
            if(err) {
              console.error('set uid for session service failed! error is : %j', err.stack);
            }
          });
          console.log("uid : "+session.get("uid"))
          session.on('closed', onUserLeave.bind(null,self));

          cb(null)        
        })
      },
      function(cb){
        self.app.rpc.game.remote.reconnection(session,userId,self.app.get('serverId'),function(data) {
            if(data){
              notify.reconnection = data
            }
            cb(null)
        })
      },
      function() {
        self.gameChanel.add(userId,self.app.get('serverId'))
        self.channelService.pushMessageByUids('onMessage', notify, [{
          uid: userId,
          sid: "connector-server-1"
        }]);
      }
      ],
    function(err,result) {
      console.log("enter error")
      console.log(err)
      console.log(result)
      next(null,{code : -200})
      return
    }
  )
  next(null, {
      code: 100
  });
};

//接受客户端发送数据
handler.sendData = function(msg, session, next){
    console.log("code : "+msg.code)
    var self = this;
    //判断登录
    var uid = session.get("uid")
    console.log("uid : "+uid)  
    if(!!uid){
        if(msg.code == "join" || msg.code == "newRoom"){
          if(msg.params){
            msg.params.ip = this.sessionService.getClientAddressBySessionId(session.id).ip   
          }
        }
        self.app.rpc.game.remote.receive(session, uid, self.app.get('serverId'), msg.code,msg.params, function(flag){
            next(null,{flag : flag});
        });   
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
    return;
  }
  self.gameChanel.leave(session.uid,self.app.get('serverId'))
  self.app.rpc.game.remote.kick(session,session.uid,null);
};
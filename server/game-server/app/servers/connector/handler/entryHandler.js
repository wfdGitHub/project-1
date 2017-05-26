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
handler.test = function(msg,session,next) {
  var notify = {
    "cmd" : "broadcast",
    "content" : "恭喜玩家47抽中了幸运大奖！价值499万美元法拉利一辆"
  }
  this.gameChanel.pushMessage('onNotify',notify)
  next()
}
//登录
handler.enter = function(msg, session, next) {
  var self = this;
  var uid = msg.uid
  var sessionService = self.app.get('sessionService');

  //duplicate log in
  if( !! sessionService.getByUid(uid)) {
    next(null, {
      code: 500,
      error: true
    });
    return;
  }
  session.bind(uid);
  session.set("uid", uid);
  session.push("uid", function(err) {
    if(err) {
      console.error('set uid for session service failed! error is : %j', err.stack);
    }
  });
  console.log("uid : "+session.get("uid"))
  session.on('closed', onUserLeave.bind(null,self));
  //检查账号  账号不存在则创建
  self.app.rpc.db.remote.check(session, uid,function(flag) {
    //获取玩家信息
    self.app.rpc.db.remote.getPlayerInfo(session,uid,function(data) {
      var notify = {
        cmd : "userInfo",
        data : data
      }
      self.channelService.pushMessageByUids('onMessage', notify, [{
        uid: uid,
        sid: "connector-server-1"
      }]);
    })
  });   

  this.gameChanel.add(uid,self.app.get('serverId'))
  //put user into channel
    

    next(null, {
        code: 100,
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
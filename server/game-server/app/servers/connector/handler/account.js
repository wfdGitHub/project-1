var async = require('async')

module.exports = function(app) {
  return new Handler(app)
}

var Handler = function(app) {
  this.app = app
  Handler.app = app
  this.sessionService = this.app.get('sessionService')
  this.channelService = this.app.get('channelService')
}

var handler = Handler.prototype




handler.changeSignature = function(msg,session,next) {
	//更改签名档
	var uid = session.get("uid")
	if(!uid){
		next(null,{"flag" : false})
		return
	}
	var signature = msg.signature
	if(typeof(signature) != "string" || signature.length > 128){
		next(null,{"flag" : false})
		return
	}
	this.app.rpc.db.remote.changeValue(null,uid,"signature",signature,function(flag) {
		next(null,{"flag" : flag})
	})
}



handler.bindWeiXinUnionid = function(msg, session, next) {
	//游客账号绑定微信
	var self = this
	var uid = session.get("uid")
	var openId = msg.openId
	var token = msg.token
	var unionid = 0
	if(!!uid){
		async.waterfall([
				function(cb){
					//判断是否是游客
					self.app.rpc.db.remote.getPlayerString(null,uid,"uidMap",function(data) {
						if(data == uid){
							//是游客
							cb()
						}else{
							console.log("不是游客")
							next(null,{"flag" : false,"code" : 1})
						}
					})
				},
				function(cb) {
					//获取微信unionid
			        self.app.rpc.login.remote.checkUser(session, {"openId" : openId,"token" : token},function(result){
			            if(result == false){
			                next(null,{"flag" : false,"code" : 2})
			            }else{
			            	console.log(result)
			              	unionid = result.unionid
			              	cb()
			            }
			        })
				},
				function(cb) {
					//判断该微信号没有绑定过账号
					self.app.rpc.db.remote.getPlayerString(null,unionid,"uidMap",function(data) {
						if(data){
							console.log("该微信已有账号")
							next(null,{"flag" : false,"code" : 3})							
						}else{
							cb()
						}
					})					
				},
				function(cb) {
					//绑定微信
					self.app.rpc.db.remote.changeBindUidMap(session,uid,unionid,function(data) {
						console.log(data)
						next(null,{"flag" : true})
					})
				}
			],
		    function(err,result) {
		      next(null,{"flag" : false})
		      return
		    }
		)		
	}else{
		next(null,{"flag" : false})
	}
}

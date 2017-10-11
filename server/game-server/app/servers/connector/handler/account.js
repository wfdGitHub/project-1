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
	signature = strReplace(signature)
	this.app.rpc.db.remote.changeValue(null,uid,"signature",signature,function(flag) {
		next(null,{"flag" : flag})
	})
}

handler.changeNickName = function(msg,session,next) {
	//更改昵称
	var uid = session.get("uid")
	if(!uid){
		next(null,{"flag" : false,"msg" : "请重新登陆再试"})
		return
	}
	var nickname = msg.nickname
	if(!nickname || typeof(nickname) != "string" || nickname.length > 24){
		next(null,{"flag" : false,"msg" : "输入昵称错误，请重新输入"})
		return
	}
	nickname = strReplace(nickname)
	this.app.rpc.db.remote.changeNickName(null,uid,nickname,function(flag,msg) {
		next(null,{"flag" : flag,"msg" : msg})
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
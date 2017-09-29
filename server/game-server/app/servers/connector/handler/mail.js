var async = require("async")

//邮件模块
module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
	this.app = app
	Handler.app = app
};


var handler = Handler.prototype

//获取邮件列表
handler.getMailList = function(msg,session,next) {
	var uid = session.get("uid")
	if(!uid){
		next(null,false)
		return
	}
	this.app.rpc.db.remote.getPlayerObject(session,uid,"mailList",function(data) {
		console.log(data)
		if(data){
			next(null,{flag : true,data : data})
		}
		next(null,{flag : false})
	})
}

//领取附件
handler.gainAffix = function(msg,session,next) {
	var uid = session.get("uid")
	var mailId = msg.mailId
	if(!uid){
		next(null,{flag : false})
		return
	}
	if(!mailId){
		next(null,{flag : false})
		return		
	}
	var self = this
	var affix = false
	self.app.rpc.db.remote.getPlayerObject(session,uid,"mailList",function(data) {
		console.log(data)
		if(data){
			for(var i = 0;i < data.length;i++){
				if(data[i].id == mailId){
					if(data[i].affix && data[i].gainState == true){
						data[i].readState = false
						data[i].gainState = false
						affix = data[i].affix
						//设置邮件
						self.app.rpc.db.remote.setPlayerObject(session,uid,"mailList",data,function(flag) {
							//获取奖励
							self.app.rpc.db.remote.setValue(session,uid,affix.type,affix.value,function(flag) {
								if(flag){
									next(null,{flag : true,affix : affix})
								}
							})
						})
						return						
					}
				}
			}
		}
		next(null,{flag : false})
	})
}

//读邮件
handler.readMail = function(msg,session,next) {
	var uid = session.get("uid")
	var mailId = msg.mailId
	if(!uid){
		next(null,{flag : false})
		return
	}
	if(!mailId){
		next(null,{flag : false})
		return		
	}
	var self = this
	self.app.rpc.db.remote.getPlayerObject(session,uid,"mailList",function(data) {
		console.log(data)
		if(data){
			for(var i = 0;i < data.length;i++){
				if(data[i].id == mailId){
					if(data[i].readState == true){
						data[i].readState = false
						//设置邮件
						self.app.rpc.db.remote.setPlayerObject(session,uid,"mailList",data,function(flag) {
							next(null,{flag : true})
						})
						return						
					}
				}
			}
		}
		next(null,{flag : false})
	})
}


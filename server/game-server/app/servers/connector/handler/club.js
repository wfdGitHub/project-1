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
var local = {}

//获取成员列表
handler.getClubList = function(msg,session,next) {
	var self = this
	var uid = session.get("uid")
	if(!!uid){
		async.waterfall([
				function(cb) {
					//判断是否开启俱乐部权限
					self.app.rpc.db.remote.getValue(session,uid,"clubLimit",function(data){
						if(data >= 1){
							cb()
						}else{
							next(null,{"flag" : false,"result" : "权限不足"})
						}
					})
				},
				function(cb){
					//获取成员列表
					self.app.rpc.db.remote.getClubList(session,uid,function(data) {
						next(null,{"flag" : true,"data" : data})
					})
				}
			],function(err,result) {
		      console.log("enter error")
		      console.log(err)
		      console.log(result)
		      next(null,{"flag" : false,code : -200})
		      return
		})
	}else{
		next(null,{flag : false})
	}
}


//添加俱乐部成员
handler.addClubPlayer = function(msg,session,next) {
	if(!msg.playerId || typeof(msg.playerId) != "number"){
		next(null,{"flag" : false,"result" : "参数错误"})
		return
	}
	var self = this
	var uid = session.get("uid")
	if(!!uid){
		async.waterfall([
				function(cb) {
					//判断是否开启俱乐部权限
					self.app.rpc.db.remote.getValue(session,uid,"clubLimit",function(data){
						if(data >= 1){
							cb()
						}else{
							next(null,{"flag" : false,"result" : "权限不足"})
						}
					})
				},
				function(cb){
					//添加俱乐部成员
					self.app.rpc.db.remote.addClubPlayer(session,uid,msg.playerId,function(data) {
						next(null,{"flag" : (data ? true : false),"data" : data})
					})
				}
			],function(err,result) {
		      console.log("enter error")
		      console.log(err)
		      console.log(result)
		      next(null,{"flag" : false,code : -200})
		      return
		})
	}else{
		next(null,{flag : false})
	}	
}



//删除俱乐部成员
handler.removeClubPlayer = function(msg,session,next) {
	if(!msg.playerId || typeof(msg.playerId) != "number"){
		next(null,{"flag" : false,"result" : "参数错误"})
		return
	}
	var self = this
	var uid = session.get("uid")
	if(!!uid){
		async.waterfall([
				function(cb) {
					//判断是否开启俱乐部权限
					self.app.rpc.db.remote.getValue(session,uid,"clubLimit",function(data){
						if(data >= 1){
							cb()
						}else{
							next(null,{"flag" : false,code : "权限不足"})
						}
					})
				},
				function(cb){
					//删除俱乐部成员
					self.app.rpc.db.remote.removePlayer(session,uid,msg.playerId,function(data) {
						next(null,{"flag" : data})
					})
				}
			],function(err,result) {
		      console.log("enter error")
		      console.log(err)
		      console.log(result)
		      next(null,{"flag" : false,code : -200})
		      return
		})	
	}else{
		next(null,{flag : false})
	}	
}



//仅俱乐部成员加入开关
handler.clubSwitch = function(msg,session,next) {
	if(typeof(msg.flag) !== "boolean"){
		next(null,{"flag" : false,code : "参数错误"})
		return
	}
	var self = this
	var uid = session.get("uid")
	if(!!uid){
		async.waterfall([
				function(cb) {
					//判断是否开启俱乐部权限
					self.app.rpc.db.remote.getValue(session,uid,"clubLimit",function(data){
						if(data >= 1){
							cb()
						}else{
							next(null,{"flag" : false,code : "权限不足"})
						}
					})
				},
				function(cb){
					//开启俱乐部开关
					self.app.rpc.db.remote.clubSwitch(session,uid,msg.flag,function(data) {
						next(null,{"flag" : data})
					})
				}
			],function(err,result) {
		      console.log("enter error")
		      console.log(err)
		      console.log(result)
		      next(null,{"flag" : false,code : -200})
		      return
		})
	}else{
		next(null,{flag : false})
	}	
}

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

//分享领取奖励
handler.shareAward = function(msg,session,next) {
	var self = this
	var uid = session.get("uid")
	if(!!uid){
	  	self.app.rpc.db.remote.getPlayerObject(session,uid,"refreshList",function(data) {
		  	//console.log(data)
	  		var dateString = local.getDateString()
	  		//console.log(dateString)
	  		//隔日更新refreshList
	  		if(data.shareTime < dateString){
	  			data.shareCount = 0
	  			data.shareTime = dateString
	  		}
	  		if(data.shareCount >= 1){
	  			next(null,{flag : false})
	  			return
	  		}
	  		//领取奖品
	  		data.shareCount++
	  		self.app.rpc.db.remote.setPlayerObject(session,uid,"refreshList",data,function() {})
			self.app.rpc.db.remote.setValue(session,uid,"diamond",3,function(){
				next(null,{flag : true,award : "diamond",value : 3})
			})
	  	})
	}else{
		next(null,{flag : false})
	}
}

local.getDateString = function() {
	var myDate = new Date()
	var month = myDate.getMonth() + 1
	var date = myDate.getDate()
	if(month < 10){
		month = "0"+month
	}
	if(date < 10){
		date = "0"+date
	}
	var dateString = parseInt(""+myDate.getFullYear() + month + date)
	return dateString
}
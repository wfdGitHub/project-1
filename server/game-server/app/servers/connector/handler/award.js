var async = require('async')
var dayAwardConf = require("../../../conf/dayAward.js")
var giftBagConf = require("../../../conf/giftBag.js")
var giveCfg = require("../../../conf/give.js")
var goldConf = require("../../../conf/goldConf.js")
var giveMailConfLogger = require("pomelo-logger").getLogger("giveMail-log")

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

//每日奖励
handler.dayAward = function(msg,session,next) {
	var self = this
	var uid = session.get("uid")
	if(!!uid){
	  	self.app.rpc.db.remote.getPlayerObject(session,uid,"refreshList",function(data) {
	  		if(data.dayAwardUse < data.dayAwardCount){
	  			data.dayAwardUse++
	  			if(data.dayAwardList[data.time]){
	  				data.dayAwardList[data.time]++
	  			}else{
	  				data.dayAwardList[data.time] = 1
	  			}
	  			self.app.rpc.db.remote.setPlayerObject(session,uid,"refreshList",data,function() {
		  			var awardId = data.time - data.dayAwardTime + 1
		  			var award = dayAwardConf[awardId]
		  			local.addAwardByItemId(uid,award.itemId,award.amount)
		  			next(null,{flag : true,award : award})
	  			})
	  		}else{
	  			next(null,{flag : false})
	  		}
	  	})
	}else{
		next(null,{flag : false})
	}
}

//获取充值记录
handler.getRechargeInfo = function(msg,session,next) {
	var uid = session.get("uid")
	if(!!uid){
		this.app.rpc.db.remote.getPlayerObject(session,uid,"rechargeRecord",function(data){
			if(data){
				next(null,{flag : true,"data" : data})
			}else{
				next(null,{flag : false})
			}
		})
	}else{
		next(null,{flag : false})
	}
}

//购买金币
handler.buyGold = function(msg,session,next) {
	var buyType = msg.type
	if(!buyType || typeof(buyType) !== "number" || !goldConf[buyType]){
		next(null,{flag : false})
	}
	var uid = session.get("uid")
	var self = this
	if(!!uid){
		//获取钻石
		self.app.rpc.db.remote.getValue(session,uid,"diamond",function(data){
			var diamond = goldConf[buyType].diamond
			if(data && data >= diamond){
				self.app.rpc.db.remote.setValue(session,uid,"diamond",-diamond,"购买金币",function() {
					var gold = goldConf[buyType].gold
					self.app.rpc.db.remote.setValue(session,uid,"gold",gold,"购买金币",function() {
						next(null,{flag : true})
					})
				})
			}else{
				next(null,{flag : false})
			}
		})
	}else{
		next(null,{flag : false})
	}
}


//获取赠送记录
handler.getGiveRecord = function(msg,session,next) {
	var uid = session.get("uid")
	if(!uid){
		next(null,{flag : false})
		return
	}
	this.app.rpc.db.remote.getPlayerObject(session,uid,"giveRecord",function(data){
		if(data){
			next(null,{flag : true,"data" : data})
		}else{
			next(null,{flag : false})
		}
	})	
}


local.getDateString = function() {
	var myDate = new Date()
	var month = myDate.getMonth()
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

local.addAwardByItemId = function(uid,itemId,value) {
	switch(itemId){
		case 101 : 
		//钻石
		Handler.app.rpc.db.remote.incrbyPlayer(null,uid,"diamond",value,function(){})
		break
		case 102 :
		//金币
		Handler.app.rpc.db.remote.incrbyPlayer(null,uid,"gold",value,function(){})
		break
		default :
		//物品
		Handler.app.rpc.db.remote.addItem(null,uid,itemId,value,function(){})
		break
	}
}
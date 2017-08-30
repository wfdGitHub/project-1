var async = require('async')
var lottoConf = require("../../../conf/lotto.js")
var giftBagConf = require("../../../conf/giftBag.js")

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

//每日转盘
handler.dayLotte = function(msg,session,next) {
	var self = this
	var uid = session.get("uid")
	if(!!uid){
		//获取refreshList
	  	self.app.rpc.db.remote.getPlayerObject(session,uid,"refreshList",function(data) {
	  		//console.log(data)
	  		var myDate = new Date()
	  		var dateString = parseInt(""+myDate.getFullYear() + myDate.getMonth() + myDate.getDate())
	  		//console.log(dateString)
	  		//隔日更新refreshList
	  		if(data.lottoTime < dateString){
	  			data.lottoCount = 0
	  			data.lottoTime = dateString
	  		}
	  		if(data.lottoCount >= 1){
	  			next(null,{flag : false})
	  			return
	  		}
	  		data.lottoCount++
	  		self.app.rpc.db.remote.setPlayerObject(session,uid,"refreshList",data,function() {})
	  		//领取奖品
	  		var weight = 0
	  		for(var i = 0; i < lottoConf.length; i++){
	  			weight += lottoConf[i].weight
	  		}
	  		console.log("weight : "+weight)
	  		var rand = Math.floor(Math.random() * weight)
	  		var curWeight = 0
	  		for(var i = 0; i < lottoConf.length; i++){
	  			curWeight += lottoConf[i].weight
	  			if(rand < curWeight){
	  				//领取奖励
	  				if(lottoConf[i].type){
	  					self.app.rpc.db.remote.setValue(session,uid,lottoConf[i].type,lottoConf[i].value,function() {})
	  				}
	  				next(null,{flag : true,"data" : lottoConf[i],"index" : i})
	  				return
	  			}
	  		}
	  	})
	}else{
		next(null,{flag : false})
	}
}

//领取低保
handler.bankruptGold = function(msg,session,next) {
	var self = this
	var uid = session.get("uid")
	if(!!uid){
		//获取refreshList
		async.waterfall([
	      function(cb) {
	      	self.app.rpc.db.remote.getPlayerInfo(session,uid,function(data) {
	      		//判断金币低于领取线
	      		//console.log(data)
	      		if(data.gold > 2000){
	      			next(null,{flag : false})
	      			return
	      		}
	      		cb()
	      	})
	      },
	      function(cb) {
		  	self.app.rpc.db.remote.getPlayerObject(session,uid,"refreshList",function(data) {
		  		//console.log(data)
		  		var myDate = new Date()
		  		var dateString = parseInt(""+myDate.getFullYear() + myDate.getMonth() + myDate.getDate())
		  		//console.log(dateString)
		  		//隔日更新refreshList
		  		if(data.bankruptTime < dateString){
		  			data.bankruptTimeCount = 0
		  			data.bankruptTime = dateString
		  		}
		  		if(data.bankruptTimeCount >= 2){
		  			next(null,{flag : false})
		  			return
		  		}
		  		//领取奖品
		  		data.bankruptTimeCount++
		  		self.app.rpc.db.remote.setPlayerObject(session,uid,"refreshList",data,function() {})
	  			self.app.rpc.db.remote.setValue(session,uid,"gold",2000,function(){
					next(null,{flag : true,award : "gold",value : 2000})
	  			})
		  	})
	      }
		],
	    function(err,result) {
	      next(null,{"flag" : false,code : -200})
	      return
	    }
	  )
	}else{
		next(null,{flag : false})
	}
}

//领取充值礼包
handler.getGiftBag = function(msg,session,next) {
	var uid = session.get("uid")
	var self = this
	if(!!uid){
		//获取玩家充值信息
		self.app.rpc.db.remote.getPlayerObject(session,uid,"rechargeRecord",function(data) {
			if(giftBagConf[data.curGiftBag]){
				if(data.curValue >= giftBagConf[data.curGiftBag].RMB){
					//领取奖励
					var type = giftBagConf[data.curGiftBag].award.type
					var value = giftBagConf[data.curGiftBag].award.value
	  				if(type){
	  					self.app.rpc.db.remote.setValue(session,uid,type,value,function(){
	  						//更新礼包记录
	  						next(null,{flag : true,"data" : giftBagConf[data.curGiftBag],"index" : data.curGiftBag})
	  						data.curGiftBag++
	  						data.curValue = 0
	  						self.app.rpc.db.remote.setPlayerObject(session,uid,"rechargeRecord",data,function(){})
	  					})
	  				}		
				}else{
					next(null,{flag : false})
				}				
			}else{
				next(null,{flag : false})
			}
		})
	}else{
		next(null,{flag : false})
	}
}

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
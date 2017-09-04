var httpConf = require("../../../conf/httpModule.js")
var signInConf = require("../../../conf/signIn.js")


module.exports = function(app) {
	return new DBRemote(app);
};

var local = {}

var DBRemote = function(app) {
	this.app = app
	DBRemote.app = app
    DBRemote.dbService = this.app.get("dbService")
    DBRemote.channelService = this.app.get('channelService')
    if(DBRemote.dbService && DBRemote.dbService.db){
    	DBRemote.db = DBRemote.dbService.db
    }
}	

var createAccount = function(result,cb) {
	DBRemote.dbService.setUserId(result.unionid,function(playerId) {
		var uid = playerId
		DBRemote.dbService.setPlayer(uid,"diamond",10)
		DBRemote.dbService.setPlayer(uid,"nickname",result.nickname)
		DBRemote.dbService.setPlayer(uid,"head",result.headimgurl)
		DBRemote.dbService.setPlayer(uid,"uid",uid)
		DBRemote.dbService.setPlayer(uid,"sex",result.sex)
		DBRemote.dbService.setPlayer(uid,"limits",0)
		DBRemote.dbService.setPlayer(uid,"freeze",0)
		DBRemote.dbService.setPlayer(uid,"useDiamond",0)
		DBRemote.dbService.setPlayer(uid,"gold",5000)
		DBRemote.dbService.setPlayer(uid,"charm",0)
		var history = {}
		history.allGames = 0
		history.List = {}
		DBRemote.dbService.setPlayerObject(uid,"history",history)
		//每日刷新数据
		var refreshList = {}
		refreshList.lottoTime = 0 					//抽奖
		refreshList.lottoCount = 0 				
		refreshList.bankruptTime = 0				//破产保护
		refreshList.bankruptTimeCount = 0			
		refreshList.dayGoldTime = 0					//每日金币输赢
		refreshList.dayGoldValue = 0
		refreshList.charmTime = 0 					//今日魅力值
		refreshList.charmValue = 0
		DBRemote.dbService.setPlayerObject(uid,"refreshList",refreshList)
		//连续登陆记录
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
		var  loginRecord = {}
		loginRecord.recordDate = dateString
		loginRecord.loginDay = 1
		loginRecord.loginMax = 1
		DBRemote.dbService.setPlayerObject(uid,"loginRecord",loginRecord)
		//充值记录
		var rechargeRecord = {}
		rechargeRecord.allValue = 0
		rechargeRecord.curGiftBag = 1
		rechargeRecord.curValue = 0
		DBRemote.dbService.setPlayerObject(uid,"rechargeRecord",rechargeRecord)
		cb(false)
	})
}
//每次登陆更新微信信息
var updateAccount = function(result) {
	var uid = result.playerId
	DBRemote.dbService.setPlayer(uid,"nickname",result.nickname)
	DBRemote.dbService.setPlayer(uid,"head",result.headimgurl)
	DBRemote.dbService.setPlayer(uid,"sex",result.sex)
}
//检查账号是否存在
DBRemote.prototype.check = function(result,cb) {
	//console.log("=================")
	//console.log("result.unionid : "+result.unionid)
	DBRemote.dbService.getPlayerString(result.unionid,"uidMap",function(data) {

		//console.log("data : "+data)
		if(!data){
			createAccount(result,cb)
			//console.log("create ok!!")
		}else{
			result.playerId = parseInt(data)
			updateAccount(result)
			if(cb){
				cb(true)
			}
		}
	})
}

//登陆回调
DBRemote.prototype.loginCB = function(uid,cb) {
  DBRemote.dbService.getPlayerObject(uid,"loginRecord",function(data) {
      if(data){
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
        if(dateString != data.recordDate){
          //今日未登陆则判断昨天是否登陆，若是则增加登陆天数
          myDate.setDate(myDate.getDate() - 1)
		  month = myDate.getMonth()
		  date = myDate.getDate()
		  if(month < 10){
		  	month = "0"+month
		  }
		  if(date < 10){
		  	date = "0"+date
		  }
		  var oldDateString = parseInt(""+myDate.getFullYear() + month + date)   
          if(oldDateString == data.recordDate){
              data.recordDate = dateString
              data.loginDay += 1
              if(data.loginMax < data.loginDay){
              	data.loginMax = data.loginDay
              	//在此领取连续签到奖励
              	if(signInConf[data.loginMax]){
              		var type = signInConf[data.loginMax]["award"]["type"]
              		var value = signInConf[data.loginMax]["award"]["value"]
              		console.log("type  : "+type)
              		console.log("value : "+value)
              		DBRemote.prototype.setValue(uid,type,value,function(argument) {
						var notify = {
							"cmd" : "signInAward",
							"data" : signInConf[data.loginMax]
						}
						DBRemote.app.rpc.game.remote.sendByUid(null,uid,notify,function(){})
              		})
              	}
              }
          }else{
            data.recordDate = dateString
            data.loginDay = 1
          }
          DBRemote.dbService.setPlayerObject(uid,"loginRecord",data,function(){})
        }
      }
      cb(data)
  })
}

DBRemote.prototype.getPlayerNickName = function(uid,cb) {
	DBRemote.dbService.getPlayerString(uid,"nickname",function(data){
		cb(data)
	})
}
//获取一个空闲ID
DBRemote.prototype.getPlayerId = function(cb) {
	DBRemote.dbService.db.get("nn:acc:lastid",function(err,data) {
		cb(data)
	})
} 

DBRemote.prototype.getPlayerInfoByUid = function(uid,cb) {
	DBRemote.dbService.getPlayerInfoByUid(uid,cb)
}

DBRemote.prototype.getPlayerInfo = function(uid,cb) {
	DBRemote.dbService.getPlayerInfo(uid,cb)
}
DBRemote.prototype.getNotify = function(cb) {
	DBRemote.dbService.getNotify(cb)
}
DBRemote.prototype.updateDiamond = function(value,cb) {
	DBRemote.dbService.updateDiamond(value)
	cb()
}
DBRemote.prototype.updateNotify = function(notify,source,cb) {
	DBRemote.dbService.getNotify(function(data) {
		console.log(data)
		if(!data[source]){
			data[source] = {}
			data[source].name = ""
		}
		data[source].content = notify
		DBRemote.dbService.setNotify(data)
		//更新公告完通知所有玩家
		DBRemote.channelService.broadcast("connector","onNotify",{"type":"notify","data":data})
		if(cb){
			cb(true)
		}
	})
}


DBRemote.prototype.setValue = function(uid,name,value,cb) {
	//console.log("uid : "+uid+" name : "+name+ " value : "+value)
	DBRemote.dbService.getPlayer(uid,name,function(data) {
		if(data != null){
			//console.log("data : "+data)
			//console.log('value :'+value)
			var oldValue = parseInt(value)
			value = parseInt(data) + oldValue
			//console.log('value :'+value)
			if(value < 0){
				value = 0
			}
			DBRemote.dbService.setPlayer(uid,name,value,cb)
			switch(name){
				case "diamond":
					//通知钻石更新
					var notify = {
						"cmd" : "updateDiamond",
						"data" : value
					}
					DBRemote.app.rpc.game.remote.sendByUid(null,uid,notify,function(){})		
					//通知后台
					httpConf.sendDiamondHttp(uid,oldValue,value,oldValue > 0 ? "inc" : "dec")	
				break
				case "gold":
					//通知金币更新
					var notify = {
						"cmd" : "updateGold",
						"data" : value
					}
					DBRemote.app.rpc.game.remote.sendByUid(null,uid,notify,function(){})
					//每日金币输赢更新
					DBRemote.dbService.getPlayerObject(uid,"refreshList",function(data) {
						//console.log(data)
				  		var myDate = new Date()
				  		var dateString = parseInt(""+myDate.getFullYear() + myDate.getMonth() + myDate.getDate())
				  		//隔日更新refreshList
				  		if(data.dayGoldTime !== dateString){
				  			data.dayGoldValue = 0
				  			data.dayGoldTime = dateString
				  		}
				  		data.dayGoldValue += oldValue
				  		console.log("========")
				  		console.log(data)
				  		DBRemote.dbService.setPlayerObject(uid,"refreshList",data,function(){})
					})
				break
				case "charm" :
					//通知魅力值更新
					var notify = {
						"cmd" : "updateCharm",
						"data" : value
					}
					DBRemote.app.rpc.game.remote.sendByUid(null,uid,notify,function(){})
					//每日魅力值更新
					DBRemote.dbService.getPlayerObject(uid,"refreshList",function(data) {
						//console.log(data)
				  		var myDate = new Date()
				  		var dateString = parseInt(""+myDate.getFullYear() + myDate.getMonth() + myDate.getDate())
				  		//隔日更新refreshList
				  		if(data.charmTime !== dateString){
				  			data.charmValue = 0
				  			data.charmTime = dateString
				  		}
				  		data.charmValue += oldValue
				  		DBRemote.dbService.setPlayerObject(uid,"refreshList",data,function(){})
					})
				break
			}
		}else{
			if(cb){
				cb(false)
			}
		}
	})
}
DBRemote.prototype.getRanklist = function(cb) {
	DBRemote.dbService.getRanklist(cb)
}
DBRemote.prototype.changeValue = function(uid,name,value,cb) {
	DBRemote.dbService.setPlayer(uid,name,value,cb)
}
//设置战绩
DBRemote.prototype.setHistory = function(uid,record,cb) {
	// console.log("uid : "+uid)
	// console.log(record)
	DBRemote.dbService.getHistory(uid,function(data) {
		// console.log("data : ")
		// console.log(data)
		data.allGames += 1
		for(var i = 9;i > 0;i--){
			if(data.List[i - 1]){
				data.List[i] = data.List[i - 1]
			}
		}
		data.List[0] = record
		DBRemote.dbService.setHistory(uid,data)
		//通知战绩更新
		var notify = {
			"cmd" : "updateHistory",
			"data" : data
		}
		DBRemote.app.rpc.game.remote.sendByUid(null,uid,notify,function(){})
		if(cb){
			cb()
		}
	})
}

DBRemote.prototype.getValue = function(uid,name,cb) {
	DBRemote.dbService.getPlayer(uid,name,cb)
}

DBRemote.prototype.getPlayerObject = function(uid,name,cb) {
	DBRemote.dbService.getPlayerObject(uid,name,cb)
}

DBRemote.prototype.setPlayerObject = function(uid,name,value,cb) {
	DBRemote.dbService.setPlayerObject(uid,name,value,cb)
}
var httpConf = require("../../../conf/httpModule.js")
var signInConf = require("../../../conf/signIn.js")
var itemConf = require("../../../conf/item.js")
var goldRecordLogger = require("pomelo-logger").getLogger("goldRecord-log")
var diamondRecordLogger = require("pomelo-logger").getLogger("diamondRecord-log")

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
		DBRemote.dbService.setPlayer(uid,"diamond",0)
		if(!result.nickname){
			result.nickname = ""+playerId
		}
		DBRemote.dbService.db.get("onlyNickName:"+result.nickname,function(err,data) {
			if(err || !data){
				//昵称不存在
				//唯一昵称
				var nickname = result.nickname
				DBRemote.dbService.db.set("onlyNickName:"+nickname,uid)	
				DBRemote.dbService.setPlayer(uid,"nickname",nickname)
			}else{
				//存在昵称
				var nickname = result.nickname + uid
				DBRemote.dbService.db.set("onlyNickName:"+nickname,uid)	
				DBRemote.dbService.setPlayer(uid,"nickname",nickname)				
			}
		})
		DBRemote.dbService.setPlayer(uid,"head",result.headimgurl)
		DBRemote.dbService.setPlayer(uid,"uid",uid)
		DBRemote.dbService.setPlayer(uid,"sex",result.sex)
		DBRemote.dbService.setPlayer(uid,"limits",0)
		DBRemote.dbService.setPlayer(uid,"freeze",0)
		DBRemote.dbService.setPlayer(uid,"useDiamond",0)
		DBRemote.dbService.setPlayer(uid,"gold",0)
		DBRemote.dbService.setPlayer(uid,"charm",0)
		DBRemote.dbService.setPlayer(uid,"contorl",0)
		DBRemote.dbService.setPlayer(uid,"signature","玩家很懒什么都没有留下")
		DBRemote.dbService.setPlayer(uid,"agencyId",false)

		//获取时间
  		var dateString = local.getDateString()

		var history = {}
		history.allGames = 0
		history.List = {}
		DBRemote.dbService.setPlayerObject(uid,"history",history)
		//每日刷新数据
		var refreshList = {}
		refreshList.dayAwardCount = 1 					//今日可领取每日奖励次数
		refreshList.dayAwardUse = 0 					//今日已使用领取奖励次数
		refreshList.dayAwardTime = dateString 			//每日奖励基准日期
		refreshList.dayAwardList = {} 					//每日奖励领取记录
		refreshList.time = dateString          	 		//最后更新时间
		// refreshList.lottoTime = 0 					//抽奖
		// refreshList.lottoCount = 0
		// refreshList.bankruptTime = 0				//破产保护
		// refreshList.bankruptTimeCount = 0
		// refreshList.dayGoldTime = 0					//每日金币输赢
		// refreshList.dayGoldValue = 0
		// refreshList.charmTime = 0 					//今日魅力值
		// refreshList.charmValue = 0
		// refreshList.shareTime = 0 					//分享领取奖励
		// refreshList.shareCount = 0
		DBRemote.dbService.setPlayerObject(uid,"refreshList",refreshList)
		// //连续登陆记录
		// var  loginRecord = {}
		// loginRecord.recordDate = dateString
		// loginRecord.lastRecord = 0
		// DBRemote.dbService.setPlayerObject(uid,"loginRecord",loginRecord)
		//充值记录
		var rechargeRecord = {}
		rechargeRecord.allValue = 0
		rechargeRecord.curGiftBag = 1
		rechargeRecord.curValue = 0
		DBRemote.dbService.setPlayerObject(uid,"rechargeRecord",rechargeRecord)
		//邮箱
		var mailList = []
		var mailInfo = {
			"id" : new Date().getTime() + "" + Math.floor(Math.random() * 100000),
			"title" : "欢迎夹娃娃",
			"content" : "欢迎夹娃娃",
			"affix" : false,
			"time" : new Date().getTime(),
			"addresser" : "运营团队",
			"uid" : 0,
			"readState" : true,
			"gainState" : true
		}
		mailList.push(mailInfo)
		DBRemote.dbService.setPlayerObject(uid,"mailList",mailList)
		//背包
		var bagList = []
		DBRemote.dbService.setPlayerObject(uid,"bagList",bagList)
		cb(false)
	})
}

DBRemote.prototype.addItem = function(uid,itemId,value,cb) {
	if(!itemConf[itemId]){
		console.log("添加失败，错误的物品ID")
		cb(false)
		return
	}
	DBRemote.dbService.getPlayerObject(uid,"bagList",function(data) {
		for(var i = 0; i < value;i++){
			data.push(itemConf[itemId])
		}
		DBRemote.dbService.setPlayerObject(uid,"bagList",data)
		cb(true)
	})
}


//每次登陆更新微信信息
var updateAccount = function(result) {
	var uid = result.playerId
	// DBRemote.dbService.setPlayer(uid,"nickname",result.nickname)
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
    //   if(data){
  		// var myDate = new Date()
  		// var month = myDate.getMonth()
  		// var date = myDate.getDate()
  		// if(month < 10){
  		// 	month = "0"+month
  		// }
  		// if(date < 10){
  		// 	date = "0"+date
  		// }
  		// var dateString = parseInt(""+myDate.getFullYear() + month + date)
    //     if(dateString != data.recordDate){
    //       //今日未登陆则判断昨天是否登陆，若是则增加登陆天数
    //       myDate.setDate(myDate.getDate() - 1)
		  // month = myDate.getMonth()
		  // date = myDate.getDate()
		  // if(month < 10){
		  // 	month = "0"+month
		  // }
		  // if(date < 10){
		  // 	date = "0"+date
		  // }
		  // var oldDateString = parseInt(""+myDate.getFullYear() + month + date)   
    //       if(oldDateString == data.recordDate){
    //           data.recordDate = dateString
    //           data.loginDay += 1
    //           if(data.loginMax < data.loginDay){
    //           	data.loginMax = data.loginDay
    //           	//在此领取连续签到奖励
    //           	if(signInConf[data.loginMax]){
    //           		var type = signInConf[data.loginMax]["award"]["type"]
    //           		var value = signInConf[data.loginMax]["award"]["value"]
    //           		console.log("type  : "+type)
    //           		console.log("value : "+value)
    //           		DBRemote.prototype.setValue(uid,type,value,function(argument) {
				// 		var notify = {
				// 			"cmd" : "signInAward",
				// 			"data" : signInConf[data.loginMax]
				// 		}
				// 		DBRemote.app.rpc.goldGame.wawaji.sendByUid(null,uid,notify,function(){})
    //           		})
    //           	}
    //           }
    //       }else{
    //         data.recordDate = dateString
    //         data.loginDay = 1
    //       }
    //       DBRemote.dbService.setPlayerObject(uid,"loginRecord",data,function(){})
    //     }
    //   }
      cb(data)
  })
}
DBRemote.prototype.getRobotControl = function(type,cb) {
	//获取机器人开关
	DBRemote.dbService.db.get("nn:robot:switch",function(err,data) {
		if(data != "true"){
			cb(false)
			return
		}
		DBRemote.dbService.db.hget("nn:robotContorl",type,function(err,data) {
			cb(data)
		})		
	})
}
DBRemote.prototype.getPlayerString = function(uid,name,cb) {
	DBRemote.dbService.getPlayerString(uid,name,function(data){
		cb(parseInt(data))
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


DBRemote.prototype.setValue = function(uid,name,value,type,cb) {
	var oldValue = parseInt(value)
	if(!oldValue){
		cb(false)
		return
	}
	var cmd = "nn:acc:"+uid+":"+name
	DBRemote.dbService.db.incrby(cmd,oldValue,function(err,value) {
		if(err){
			console.log(err)
			cb(false)
			return
		}
		console.log(value)
		if(value < 0){
			//小于0归0
			console.log("error set db value < 0")
			value = 0
			DBRemote.dbService.db.set(cmd,0)
		}
		switch(name){
			case "diamond":
				//通知钻石更新
				var notify = {
					"cmd" : "updateDiamond",
					"data" : value
				}
				DBRemote.app.rpc.goldGame.wawaji.sendByUid(null,uid,notify,function(){})
				diamondRecordLogger.info("   "+uid + " change : "+oldValue + " now : "+value + "  type : "+type)
				//通知后台
				httpConf.sendDiamondHttp(uid,oldValue,value,oldValue > 0 ? "inc" : "dec","diamond",type)
			break
			case "gold":
				//通知金币更新
				var notify = {
					"cmd" : "updateGold",
					"data" : value
				}
				DBRemote.app.rpc.goldGame.wawaji.sendByUid(null,uid,notify,function(){})
				//每日金币输赢更新
				DBRemote.dbService.getPlayerObject(uid,"refreshList",function(data) {
					//console.log(data)
			  		var dateString = local.getDateString()
			  		//隔日更新refreshList
			  		if(data.dayGoldTime !== dateString){
			  			data.dayGoldValue = 0
			  			data.dayGoldTime = dateString
			  		}
			  		data.dayGoldValue += oldValue
			  		DBRemote.dbService.setPlayerObject(uid,"refreshList",data,function(){})
			  		goldRecordLogger.info("   "+uid + " change : "+oldValue + " now : "+value + "  type : "+type)
					//通知后台
					httpConf.sendDiamondHttp(uid,oldValue,value,oldValue > 0 ? "inc" : "dec","gold",type)
				})
			break
			case "charm" :
				//通知魅力值更新
				var notify = {
					"cmd" : "updateCharm",
					"data" : value
				}
				DBRemote.app.rpc.goldGame.wawaji.sendByUid(null,uid,notify,function(){})
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
		cb(true)
	})
}

//发送邮件
DBRemote.prototype.sendMail = function(targetUid,title,content,affix,addresser,uid,cb) {
	//数据检查
	if(affix && typeof(affix.type) !== ("string") && typeof(affix.value) !== "number"){
		cb(false)
		return
	}
	var mailInfo = {
		"id" : new Date().getTime() + "" + Math.floor(Math.random() * 100000),
		"title" : title,
		"content" : content,
		"affix" : affix,
		"time" : new Date().getTime(),
		"addresser" : addresser,
		"uid" : uid,
		"readState" : true,
		"gainState" : true
	}
	DBRemote.dbService.getPlayerObject(targetUid,"mailList",function(data) {
		if(!data){
			data = []
		}
		//最多保留50封邮件
		if(data.length > 50){
			data.splice(0,1)
		}
		data.push(mailInfo)
		DBRemote.dbService.setPlayerObject(targetUid,"mailList",data,function(){
			//通知被赠送玩家有新邮件
			var notify = {
				"cmd" : "newMail"
			}
			DBRemote.app.rpc.goldGame.wawaji.sendByUid(null,targetUid,notify,function(){})			
			cb(true)
		})
	})
}


DBRemote.prototype.getRanklist = function(cb) {
	DBRemote.dbService.getRanklist(cb)
}
DBRemote.prototype.changeValue = function(uid,name,value,cb) {
	DBRemote.dbService.setPlayer(uid,name,value,cb)
}
DBRemote.prototype.incrbyPlayer = function(uid,name,value,cb) {
	DBRemote.dbService.incrbyPlayer(uid,name,value,cb)
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
		DBRemote.app.rpc.goldGame.wawaji.sendByUid(null,uid,notify,function(){})
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

//改绑UIDMAP
DBRemote.prototype.changeBindUidMap = function(uid,unionid,cb) {
    DBRemote.dbService.setPlayer(uid,"uidMap",unionid)
    DBRemote.dbService.setPlayer(unionid,"uidMap",uid)
    cb(true)
}

//改昵称
DBRemote.prototype.changeNickName = function(uid,nickname,cb) {
	DBRemote.dbService.db.get("onlyNickName:"+nickname,function(err,data) {
		if(err || !data){
			DBRemote.dbService.getPlayerString(uid,"nickname",function(data) {
				DBRemote.dbService.db.del("onlyNickName:"+data)
				DBRemote.dbService.setPlayer(uid,"nickname",nickname)
				DBRemote.dbService.db.set("onlyNickName:"+nickname,uid)
				cb(true)
			})
		}else{
			cb(false,"昵称已存在")
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
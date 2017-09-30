var httpConf = require("../../../conf/httpModule.js")

module.exports = function(app) {
	return new DBRemote(app);
};

var local = {}

var DBRemote = function(app) {
	this.app = app
	DBRemote.app = app
    DBRemote.dbService = this.app.get("dbService")
    DBRemote.channelService = this.app.get('channelService')
    DBRemote.agencyRedLists = {}
    DBRemote.timerFlag = false
    DBRemote.timerFlag2 = false
    if(DBRemote.dbService && DBRemote.dbService.db){
    	DBRemote.db = DBRemote.dbService.db
    }
}

//启动代理分红邮件
local.starRedMail = function() {
	clearInterval(DBRemote.timerFlag2)
	local.sendRedMail()
	// setInterval(local.sendRedMail,24 * 60 * 60 * 1000)
	DBRemote.timerFlag2 = setInterval(local.sendRedMail,10 * 60 * 1000)
}
//代理分红邮件发放
local.sendRedMail = function() {
	// console.log("=============sendRedMail======")
	DBRemote.dbService.db.get("nn:acc:lastid",function(err,data) {
		var count = data
		console.log("count : "+count)
		for(var i = 10001;i <= count;i++){
			local.sendRedOnce(i)
		}
	})
}
//单个代理红包
local.sendRedOnce = function(agencyId) {
	//判断是否为代理
	DBRemote.dbService.getPlayer(agencyId,"limits",function(data) {
		if(data >= 1){
			DBRemote.dbService.getPlayerObject(agencyId,"agencyRedList",function(data) {
				if(data){
					//邮件信息
					var mailInfo = {
						"id" : new Date().getTime() + "" + Math.floor(Math.random() * 100000),
						"title" : "代理分红奖励发放",
						"content" : "",
						"time" : new Date().getTime(),
						"addresser" : "系统管理员",
						"uid" : 0,
						"readState" : true,
						"gainState" : true
					}
					var goldCount = 0
					for(var index in data.list){
						goldCount += data.list[index]
						mailInfo.content += "ID " +  index + " 的玩家底分消耗为您增加了 " +  data.list[index] + " 金币\t\n"
					}
					mailInfo.content += "总计获得 " + goldCount + " 金币"
					mailInfo.affix = {"type" : "gold","value" : goldCount}
					if(goldCount > 0){
						//更新分红记录
						console.log("agencyId : "+agencyId)
						console.log(mailInfo)
						data.list = {}
				  		var myDate = new Date()
				  		var month = myDate.getMonth()
				  		var date = myDate.getDate()
						data.time =  parseInt(""+myDate.getFullYear() + month + date)
						DBRemote.dbService.setPlayerObject(agencyId,"agencyRedList",data,function(){})
						//发放邮件
						DBRemote.dbService.getPlayerObject(agencyId,"mailList",function(data) {
							if(!data){
								data = []
							}
							//最多保留50封邮件
							if(data.length > 50){
								data.splice(0,1)
							}
							data.push(mailInfo)
							DBRemote.dbService.setPlayerObject(agencyId,"mailList",data,function(){
								//通知被赠送玩家有新邮件
								var notify = {
									"cmd" : "newMail"
								}
								DBRemote.app.rpc.goldGame.remote.sendByUid(null,agencyId,notify,function(){})
							})
						})
					}

				}
			})
		}
	})
}



//代理收益分成
DBRemote.prototype.addAgncyDivide = function(agencyDivides,cb) {
	// console.log("agencyDivides=====================================================")
	// console.log(agencyDivides)
	if(!DBRemote.timerFlag){
		clearInterval(DBRemote.timerFlag)
		DBRemote.timerFlag = setInterval(local.addAgencyRedList,10 * 1000)
    	//设置指定时间启动的定时器      先获取指定时刻的时间，再获取当前时间，得到差值后，设该差值后启动第一次定时器，再循环每24小时执行一次定时器
    	var settingDate = new Date()
    	//预设到第二天六点
    	settingDate.setMinutes(0)
    	settingDate.setMilliseconds(0)
    	if(settingDate.getHours() >= 6){
    		settingDate.setDate(settingDate.getDate()+1)
    	}
    	settingDate.setHours(6)
    	var tmpDate = settingDate.getTime() - (new Date()).getTime()
    	// console.log("=================================================111")
    	// console.log(tmpDate)
    	// console.log("=================================================222")
    	setTimeout(local.starRedMail,30000)		
	}
	for(var agencyId in agencyDivides){
		if(!DBRemote.agencyRedLists[agencyId]){
			DBRemote.agencyRedLists[agencyId] = {}
		}
		for(var uid in agencyDivides[agencyId]){
			if(!DBRemote.agencyRedLists[agencyId][uid]){
				DBRemote.agencyRedLists[agencyId][uid] = 0
			}
			DBRemote.agencyRedLists[agencyId][uid] += agencyDivides[agencyId][uid]
		}
	}
	console.log(DBRemote.agencyRedLists)
	if(cb){
		cb()
	}
}
//定时把代理收益写入数据库
local.addAgencyRedList = function() {
	console.log(DBRemote.agencyRedLists)
	var tmpAgencyRedLists = deepCopy(DBRemote.agencyRedLists)
	DBRemote.agencyRedLists = {}
	// console.log("addAgencyRedList=========================================")
	// console.log(tmpAgencyRedLists)
	for(var index in tmpAgencyRedLists){
		if(tmpAgencyRedLists.hasOwnProperty(index)){
			local.addAgencyRedOnce(index,tmpAgencyRedLists[index])
		}
	}
}

local.addAgencyRedOnce = function(agencyId,divide) {
	//获取代理收益信息
	DBRemote.dbService.getPlayerObject(agencyId,"agencyRedList",function(data) {
		if(data){
			for(var index in divide){
				if(!data.list[index]){
					data.list[index] = 0
				}
				data.list[index] += divide[index]
			}
			// console.log("agencyId : "+agencyId)
			// console.log(data)
			DBRemote.dbService.setPlayerObject(agencyId,"agencyRedList",data,function(){})
		}
	})
}


var deepCopy = function(source) {
  var result={}
  for (var key in source) {
        result[key] = typeof source[key]==="object"? deepCopy(source[key]): source[key]
     } 
  return result;
}
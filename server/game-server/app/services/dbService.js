var redis = require("redis")
var RDS_PORT = 6379           
var RDS_HOST = "127.0.0.1"
var RDS_PWD = "MyRedis2017"
var RDS_OPTS = {}

module.exports = function(app) {
  return new dbService(app);
};
var dbService = function(app) {
	this.app = app
}
var local = {}
var refreshTime = 0
var goldAllRanklist = [] 
var goldDayRanklist = []

dbService.prototype.start = function(cb){
	var db = redis.createClient(RDS_PORT,RDS_HOST,RDS_OPTS)
	this.app.set("dbService",dbService)
	db.on("ready",function(res) {
		dbService.db = db
		//数据库初始配置
		dbService.db.get("nn:acc:lastid",function(err,data) {
			if(data === null){
		        console.log("\033[33m[INFO] DataBase check - nn:acc:lastid\033[0m");
		        db.set("nn:acc:lastid",10000);
    		}
		})
		dbService.db.get("nn:acc:addDiamond",function(err,data) {
			if(data === null){
		        console.log("\033[33m[INFO] DataBase check - nn:acc:addDiamond\033[0m");
		        db.set("nn:acc:addDiamond",0);
    		}
		})
		dbService.db.get("nn:notifys",function(err,data) {
			if(data === null){
		        console.log("\033[33m[INFO] DataBase check - nn:notifys\033[0m");
		        var notify = {"1" : {"name" : "","content" : ""}}
		        db.set("nn:notifys",JSON.stringify(notify));
    		}
		})
		local.refreshRanklist()
	})
	cb()
}

dbService.getRanklist = function(cb) {
	var data = {}
	data.allGoldRanklist = deepCopy(goldAllRanklist)
	data.dayGoldRanklist = deepCopy(goldDayRanklist)
	cb(data)
}

local.refreshRanklist = function() {
	//console.log("refreshRanklist")
	clearTimeout(refreshTime)
	//先收集数据，再处理排行榜
	var lastid = 0
	var curid = 0
	var players = {}
	dbService.db.get("nn:acc:lastid",function(err,data) {
		if(data === null){
			return
		}
		lastid = data
		//console.log("lastid : "+lastid)
		for(var i = 10001; i <= lastid;i++){
			dbService.getPlayerInfoByUid(i,function(data) {
				//console.log(players)
				players[data.uid] = data
				curid++
				//console.log("curid : "+curid)
				if((curid + 10000) == lastid){
					local.changeRanklist(players)
				}
			})
		}
	})
}

local.changeRanklist = function(players) {
	//console.log(players)
	goldAllRanklist = []
	goldDayRanklist = []

	for(var i in players){
		if(players.hasOwnProperty(i)){
			//总金币榜
			//若玩家金币大于总金币榜中最低值则加入榜单
			players[i].gold = parseInt(players[i].gold)
			var minGold = goldAllRanklist.length > 0 ? goldAllRanklist[goldAllRanklist.length-1].gold : 0
			if( (goldAllRanklist.length < 20 || players[i].gold > minGold) && players[i].gold > 0){
				var data = {}
				data.uid = players[i].uid
				data.nickname = players[i].nickname
				data.head = players[i].head
				data.gold = players[i].gold
				data.charm = players[i].charm
				data.dayCharm = players[i].refreshList.charmValue
				if(goldAllRanklist.length > 0){
					for(var index = goldAllRanklist.length - 1; index >= 0;index--){
						if(goldAllRanklist[index].gold > players[i].gold){
							goldAllRanklist.splice(index + 1,0,data)
							if(goldAllRanklist.length >= 20){
								goldAllRanklist.splice(20,1)
							}
							break
						}
						if(index == 0){
							goldAllRanklist.splice(0,0,data)
							if(goldAllRanklist.length >= 20){
								goldAllRanklist.splice(20,1)
							}
						}
					}				
				}else{
					if(players[i].gold > 0){
						goldAllRanklist.push(data)
					}
				}
			}
		}
	}

	for(var i in players){
		if(players.hasOwnProperty(i)){
			//今日金币榜
			//若玩家金币大于总金币榜中最低值则加入榜单
	  		var myDate = new Date()
	  		var dateString = parseInt(""+myDate.getFullYear() + myDate.getMonth() + myDate.getDate())
			if(players[i].refreshList.dayGoldTime !== dateString){
				//console.log(players[i].refreshList.dayGoldTime)
				continue
			}
			players[i].refreshList.dayGoldValue = parseInt(players[i].refreshList.dayGoldValue)
			//console.log("gold : "+players[i].refreshList.dayGoldValue)
			var minGold = goldDayRanklist.length > 0 ? goldDayRanklist[goldDayRanklist.length-1].gold : 0
			if( (goldDayRanklist.length < 20 || players[i].refreshList.dayGoldValue > minGold) && players[i].refreshList.dayGoldValue > 0){
				var data = {}
				data.uid = players[i].uid
				data.nickname = players[i].nickname
				data.head = players[i].head
				data.gold = players[i].refreshList.dayGoldValue
				data.charm = players[i].charm
				data.dayCharm = players[i].refreshList.charmValue				
				if(goldDayRanklist.length > 0){
					for(var index = goldDayRanklist.length - 1; index >= 0;index--){
						if(goldDayRanklist[index].gold > players[i].refreshList.dayGoldValue){
							goldDayRanklist.splice(index + 1,0,data)
							if(goldDayRanklist.length >= 20){
								goldDayRanklist.splice(20,1)
							}
							break
						}
						if(index == 0){
							goldDayRanklist.splice(0,0,data)
							if(goldDayRanklist.length >= 20){
								goldDayRanklist.splice(20,1)
							}
						}
					}				
				}else{
					if(players[i].refreshList.dayGoldValue > 0){
						goldDayRanklist.push(data)
					}
				}
			}
		}
	}

	// console.log(goldDayRanklist)
	// console.log(goldAllRanklist)
	refreshTime = setTimeout(local.refreshRanklist,60 * 60 * 1000)
}

dbService.updateDiamond = function(value) {
	var cmd = "nn:acc:addDiamond"
	dbService.db.get(cmd,function(err,data) {
		//console.log(cmd + "  data : "+data)
		value = parseInt(value) + parseInt(data)
		dbService.db.set(cmd,value)
	})
}


dbService.getPlayerInfo = function(uid,cb) {
	dbService.getPlayerString(uid,"uidMap",function(data) {
		if(!data){
			cb(false)
		}else{
			dbService.getPlayerInfoByUid(data,cb)
		}
	})
}

//检查部分数据   若没有则初始化
dbService.checkData = function(uid) {
	//console.log("beginCheck")
	//消耗钻石字段
	dbService.getPlayer(uid,"useDiamond",function(data) {
		//console.log(data)
		if(!data && data !== 0){
			console.log("init useDiamond for uid : "+uid)
			dbService.setPlayer(uid,"useDiamond",0,function() {})
		}
	})
	//金币字段
	dbService.getPlayer(uid,"gold",function(data) {
		//console.log(data)
		if(!data && data !== 0){
			console.log("init gold for uid : "+uid)
			dbService.setPlayer(uid,"gold",5000,function() {})
		}
	})
}

dbService.getPlayerInfoByUid = function(uid,cb) {
	//dbService.checkData(uid)
	var cmd1 = "nn:acc:"+uid+":"+"diamond"
	var cmd2 = "nn:acc:"+uid+":"+"uid"
	var cmd3 = "nn:acc:"+uid+":"+"nickname"
	var cmd4 = "nn:acc:"+uid+":"+"head"
	var cmd5 = "nn:acc:"+uid+":"+"history"
	var cmd6 = "nn:acc:"+uid+":"+"sex"
	var cmd7 = "nn:acc:"+uid+":"+"limits"
	var cmd8 = "nn:acc:"+uid+":"+"freeze"
	var cmd9 = "nn:acc:"+uid+":"+"useDiamond"
	var cmd10 = "nn:acc:"+uid+":"+"gold"
	var cmd11 = "nn:acc:"+uid+":"+"refreshList" 		//每日触发效果，如每日领破产保护，抽奖等
	var cmd12 = "nn:acc:"+uid+":"+"charm"				//魅力值
	var cmd13 = "nn:acc:"+uid+":"+"loginRecord" 		//连续登陆记录
	dbService.db.mget(cmd1,cmd2,cmd3,cmd4,cmd5,cmd6,cmd7,cmd8,cmd9,cmd10,cmd11,cmd12,cmd13,function(err,data) {
		if(!err){
			var notify = {}
			notify["diamond"] = parseInt(data[0])
			notify["uid"] = parseInt(data[1])
			notify["nickname"] = data[2]
			notify["head"] = data[3]
			notify["history"] = JSON.parse(data[4])
			notify["sex"] = parseInt(data[5])
			notify["limits"] = parseInt(data[6])
			notify["freeze"] = parseInt(data[7])
			notify["useDiamond"] = parseInt(data[8] || 0)
			notify["gold"] = parseInt(data[9] || 0)
			notify["refreshList"] = JSON.parse(data[10])
			notify["charm"] = parseInt(data[11] || 0)
			notify["loginRecord"] = data[12] ? JSON.parse(data[12]) : {}
			notify["playerId"] = uid
			cb(notify)
		}else{
			cb(false)
		}
	})
}

dbService.setPlayer = function(uid,name,value,cb) {
	var cmd = "nn:acc:"+uid+":"+name
	console.log(cmd + "  data : "+value)	
	dbService.db.set(cmd,value,function(flag) {
		if(cb){
			if(!flag){
				cb(true)
			}else{
				cb(false)
			}
		}
	})
}
dbService.getPlayerString = function(uid,name,cb) {
	var cmd = "nn:acc:"+uid+":"+name
	dbService.db.get(cmd,function(err,data) {
		//console.log(cmd + "  data : "+data)
		if(err){
			if(cb){
				cb(false)
			}
		}else{
			if(cb){
				cb(data)
			}
		}
	})
}
dbService.getPlayer = function(uid,name,cb) {
	var cmd = "nn:acc:"+uid+":"+name
	dbService.db.get(cmd,function(err,data) {
		//console.log(cmd + "  data : "+data)
		if(err){
			if(cb){
				cb(false)
			}
		}else{
			if(cb){
				cb(parseInt(data))
			}
		}
	})
}
dbService.setPlayerObject = function(uid,name,value,cb) {
	var cmd = "nn:acc:"+uid+":"+name
	console.log(cmd)
	console.log(value)
	value = JSON.stringify(value)
	dbService.db.set(cmd,value,function(flag) {
		if(cb){
			cb(flag)
		}
	})
}
dbService.getPlayerObject = function(uid,name,cb) {
	var cmd = "nn:acc:"+uid+":"+name
	dbService.db.get(cmd,function(err,data) {
		//console.log(cmd + "  data : "+data)
		if(err){
			if(cb){
				cb(false)
			}

		}else{
			if(cb){
				data = JSON.parse(data)
				cb(data)
			}
		}
	})
}
dbService.setNotify = function(notify,cb) {
	var cmd = "nn:notifys"
	//console.log(JSON.stringify(notify))
	dbService.db.set(cmd,JSON.stringify(notify),function(flag) {
		if(cb){
			cb(flag)
		}
	})
}

dbService.getNotify = function(cb) {
	var cmd = "nn:notifys"
	dbService.db.get(cmd,function(err,data) {
		cb(JSON.parse(data))
	})
}

dbService.setHistory = function(uid,history) {
	dbService.setPlayerObject(uid,"history",history)
}

dbService.getHistory = function(uid,cb) {
	dbService.getPlayerObject(uid,"history",function(data) {
		if(cb){
			cb(data)
		}
	})
}

dbService.setAgencyRoom = function(uid,agencyRoom) {
	dbService.setPlayerObject(uid,"agencyRoom",agencyRoom)
}


dbService.setUserId = function(uid,cb) {
	dbService.db.get("nn:acc:lastid",function(err,data) {
		//console.log("nn:acc:lastid : "+data)
		if(data){
	        var playerId = parseInt(data) + 1
	        dbService.db.set("nn:acc:lastid",playerId);
	        dbService.setPlayer(uid,"uidMap",playerId)
	        dbService.setPlayer(playerId,"uidMap",uid)
	        cb(playerId)
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
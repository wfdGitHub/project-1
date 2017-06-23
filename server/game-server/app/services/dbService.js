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
	})
	cb()
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

dbService.getPlayerInfoByUid = function(uid,cb) {
	var cmd1 = "nn:acc:"+uid+":"+"diamond"
	var cmd2 = "nn:acc:"+uid+":"+"uid"
	var cmd3 = "nn:acc:"+uid+":"+"nickname"
	var cmd4 = "nn:acc:"+uid+":"+"head"
	var cmd5 = "nn:acc:"+uid+":"+"history"
	var cmd6 = "nn:acc:"+uid+":"+"sex"
	var cmd7 = "nn:acc:"+uid+":"+"limits"
	var cmd8 = "nn:acc:"+uid+":"+"freeze"
	dbService.db.mget(cmd1,cmd2,cmd3,cmd4,cmd5,cmd6,cmd7,cmd8,function(err,data) {
		if(!err){
			var notify = {}
			notify["diamond"] = data[0]
			notify["uid"] = data[1]
			notify["nickname"] = data[2]
			notify["head"] = data[3]
			notify["history"] = JSON.parse(data[4])
			notify["sex"] = data[5]
			notify["limits"] = data[6]
			notify["freeze"] = data[7]
			notify["playerId"] = uid
			cb(notify)
		}else{
			cb(false)
		}
	})
}

dbService.setPlayer = function(uid,name,value,cb) {
	var cmd = "nn:acc:"+uid+":"+name
	//console.log(cmd + "  data : "+value)	
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
	//console.log(cmd)
	//console.log(value)
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
	var notify = {"1" : {"name" : "新服开启","content" : "新服火爆开启"} , "2" : {"name" : "首冲双倍","content" : "首次充值双倍返还"}}
	dbService.db.set(cmd,notify,function(flag) {
		if(cb){
			cb(flag)
		}
	})
}

dbService.getNotify = function(cb) {
	var cmd = "nn:notifys"
	dbService.db.get(cmd,function(err,data) {
		//console.log(cmd + "  data : "+data)
		//console.log(JSON.parse(data))
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

dbService.getAgencyRoom = function(uid,cb) {
	dbService.getPlayerObject(uid,"agencyRoom",function(data) {
		if(cb){
			cb(data)
		}
	})
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
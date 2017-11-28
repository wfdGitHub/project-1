var redis = require("redis")
var handler = module.exports
var RDS_PORT = 6379
var RDS_HOST = "127.0.0.1"
var RDS_PWD = "MyRedis2017"
var RDS_OPTS = {}
handler.start = function(dbService) {
	var db = redis.createClient(RDS_PORT,RDS_HOST,RDS_OPTS)
	db.on("ready",function(res) {
		dbService.db = db
		db.select("2",function(err){
			if(err){
				console.log(err)
			}
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
            dbService.db.exists("nn:wawajiConctorl",function(err,data) {
            	if(err || !data){
                    var tmpObj = {
                        "1001" : 0.3,
                        "1002" : 0.25,
                        "1003" : 0.2,
                        "1004" : 0.15,
                        "1005" : 0.1,
                        "1006" : 0.05
                    }
            		dbService.db.hmset("nn:wawajiConctorl",tmpObj,function() {})
            	}
            })
            dbService.db.exists("nn:inventory",function(err,data) {
                if(err || !data){
                    var tmpObj = {
                        "1001" : 100,
                        "1002" : 100,
                        "1003" : 100,
                        "1004" : 100,
                        "1005" : 100,
                        "1006" : 100
                    }
                    dbService.db.hmset("nn:inventory",tmpObj,function() {})
                }
            })
            dbService.db.exists("nn:consume",function(err,data) {
                if(err || !data){
                    var tmpObj = {
                        "1001" : 10,
                        "1002" : 20,
                        "1003" : 30,
                        "1004" : 40,
                        "1005" : 50,
                        "1006" : 60
                    }
                    dbService.db.hmset("nn:consume",tmpObj,function() {})
                }
            })                    
		})
	})
}
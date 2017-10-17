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
            dbService.db.hexists("nn:robotContorl","normal",function(err,data) {
            	if(err || !data){
                    var tmpObj = {
                    	"normal" : true,
                        "goldMingpai-1-gold" : 0.05,
                        "goldMingpai-2-gold" : 0.1,
                        "goldMingpai-3-gold" : 0.2,
                        "goldMingpai-4-gold" : 1,
                        "goldMingpai-5-gold" : 0.35,
                        "goldNiuNiu-1-gold" : 0.05,
                        "goldNiuNiu-2-gold" : 0.1,
                        "goldNiuNiu-3-gold" : 0.2,
                        "goldNiuNiu-4-gold" : 1,
                        "goldNiuNiu-5-gold" : 0.35
                    }
            		dbService.db.hmset("nn:robotContorl",tmpObj,function() {})
            	}
            })
            dbService.db.hexists("nn:inventory","normal",function(err,data) {
                if(err || !data){
                    var tmpObj = {
                        "normal" : true,
                        "goldMingpai-1-gold" : -100000,
                        "goldMingpai-2-gold" : -100000,
                        "goldMingpai-3-gold" : -100000,
                        "goldMingpai-4-gold" : -100000,
                        "goldMingpai-5-gold" : -100000,
                        "goldNiuNiu-1-gold" : -100000,
                        "goldNiuNiu-2-gold" : -100000,
                        "goldNiuNiu-3-gold" : -100000,
                        "goldNiuNiu-4-gold" : -100000,
                        "goldNiuNiu-5-gold" : -100000
                    }
                    dbService.db.hmset("nn:inventory",tmpObj,function() {})
                }
            })            
		})
	})
}
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
		//游戏类型开关
		dbService.db.get("nn:game:switch",function(err,data) {
			if(data === null){
		        console.log("\033[33m[INFO] DataBase check - nn:game:switch\033[0m");
		        var tmpTable = {
		        	"niuniu" : true,
		        	"zhajinniu" : false,
		        	"mingpaiqz" : true,
		        	"fengkuang" : false,
		        	"sanKung" : true,
		        	"zhajinhua" : true
		        }
		        db.set("nn:game:switch",JSON.stringify(tmpTable));
    		}
		})
	})
}
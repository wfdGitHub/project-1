var redis = require("redis")
var handler = module.exports
var RDS_PORT = 6379
var RDS_HOST = "127.0.0.1"
var RDS_PWD = "MyRedis2017"
var RDS_OPTS = {}
var ROOM_ALL_AMOUNT = 20000			   //总房间数量
var ROOM_BEGIN_INDEX = 200800   	   //起始房间ID
handler.start = function(dbService) {
	var db = redis.createClient(RDS_PORT,RDS_HOST,RDS_OPTS)
	db.on("ready",function(res) {
		db.select("1",function(err) {
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


			//gameServer数据
			//roomList
			dbService.db.hexists("gameServer:roomList","flag",function(err,data) {
				if(err || !data){
					dbService.db.hset("gameServer:roomList","flag",true)
	    		}
			})
			//roomState
			dbService.db.hexists("gameServer:roomState","flag",function(err,data) {
				if(err || !data){
					dbService.db.hset("gameServer:roomState","flag",true)
					for(var i = ROOM_BEGIN_INDEX;i < ROOM_ALL_AMOUNT + ROOM_BEGIN_INDEX;i++){
						dbService.db.hset("gameServer:roomState",i,true)
					}
	    		}
			})
			//userMap
			dbService.db.hexists("gameServer:userMap","flag",function(err,data) {
				if(err || !data){
					dbService.db.hset("gameServer:userMap","flag",true)
	    		}
			})
			//roomMap
			dbService.db.hexists("gameServer:RoomMap","flag",function(err,data) {
				if(err || !data){
					dbService.db.hset("gameServer:RoomMap","flag",true)
	    		}
			})
			//agencyList
			dbService.db.hexists("gameServer:agencyList","flag",function(err,data) {
				if(err || !data){
					dbService.db.hset("gameServer:agencyList","flag",true)
	    		}
			})
			//AgencyReopenList
			dbService.db.hexists("gameServer:AgencyReopenList","flag",function(err,data) {
				if(err || !data){
					dbService.db.hset("gameServer:AgencyReopenList","flag",true)
	    		}
			})
			//roomHostList
			dbService.db.hexists("gameServer:roomHostList","flag",function(err,data) {
				if(err || !data){
					dbService.db.hset("gameServer:roomHostList","flag",true)
	    		}
			})
		})
	})
}
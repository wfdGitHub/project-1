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
		db.get("nn:acc:lastid",function(data) {
			if(data == null){
		        console.log("\033[33m[INFO] DataBase check - nn:acc:lastid\033[0m");
		        db.set("nn:acc:lastid",-1);
    		}
		})

	})
	cb()
}


dbService.setPlayer = function(uid,name,value,cb) {
	dbService.db.set("nn:acc:"+uid+":"+name,value,function(flag) {
		if(cb){
			cb(flag)
		}
	})
}

dbService.getPlayer = function(uid,name,cb) {
	dbService.db.get("nn:acc:"+uid+":"+name,function(data) {
		if(data){
			if(cb){
				cb(data)
			}
		}else{
			if(cb){
				cb(false)
			}
		}
	})
}
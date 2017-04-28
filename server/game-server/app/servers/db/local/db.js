var redis = require("redis")
var RDS_PORT = 6379           
var RDS_HOST = "127.0.0.1"
var RDS_PWD = "MyRedis2017"
var RDS_OPTS = {}


// db.auth(RDS_PWD,function(argument) {
//   console.log("redis auth ok!!!!!")
// })

module.exports.startDB = function(){
	var db = redis.createClient(RDS_PORT,RDS_HOST,RDS_OPTS)
	db.on("ready",function(res) {
	  console.log("redis ready : !!!!!!!!!!!!!!!!!!"+res)
	})
}



return module
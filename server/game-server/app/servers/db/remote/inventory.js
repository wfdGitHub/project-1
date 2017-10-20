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
    if(DBRemote.dbService && DBRemote.dbService.db){
    	DBRemote.db = DBRemote.dbService.db
    }
}

DBRemote.prototype.getInventory = function(gameType,cb) {
    DBRemote.dbService.db.hget("nn:inventory",gameType,function(err,data) {
        if(err){
            console.log(err)
            cb(0)
        }else{
            cb(data)
        }
    })
}

DBRemote.prototype.updateInventory = function(gameType,value,cb) {
    DBRemote.dbService.db.hincrby("nn:inventory",gameType,parseInt(value),function(err,data) {
        if(err){
            console.log(err)
        }
        console.log(data)
        if(parseInt(data) < 0 && parseInt(data) - parseInt(value) > 0){
            var result = gameType + "库存剩余"+value
            DBRemote.app.rpc.goldGame.snsServer.sendCaptcha(null,result,function (argument) {})
        }
        cb()
    })
}
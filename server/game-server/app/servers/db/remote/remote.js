module.exports = function(app) {
	return new DBRemote(app);
};

var DBRemote = function(app) {
	this.app = app
    DBRemote.dbService = this.app.get("dbService")
    if(DBRemote.dbService && DBRemote.dbService.db){
    	DBRemote.db = DBRemote.dbService.db
    	console.log(DBRemote.db.get("nn:acc:lastid"))
    }
    
}

var createAccount = function(uid,cb) {
	var notify = {}
	notify.uid = uid
	notify.head = 0
	notify.score = 0
	notify.nickname = "name"+uid
	notify.diamond = 100
	DBRemote.dbService.setPlayer(uid,"diamond",notify.diamond)
	DBRemote.dbService.setPlayer(uid,"nickname",notify.nickname)
	DBRemote.dbService.setPlayer(uid,"score",notify.score)
	DBRemote.dbService.setPlayer(uid,"head",notify.head)
	DBRemote.dbService.setPlayer(uid,"uid",notify.uid)

	cb(true)
}


DBRemote.prototype.check = function(uid,cb) {
	DBRemote.dbService.getPlayer(uid,"uid",function(data) {
		console.log("data : "+data)
		if(!data){
			createAccount(uid,cb)
			console.log("create ok!!")
		}else{
			if(cb){
				cb(true)
			}
		}
	})
}
DBRemote.prototype.getPlayerInfo = function(uid,cb) {
	DBRemote.dbService.getPlayerInfo(uid,cb)
}
DBRemote.prototype.setValue = function(uid,name,value,cb) {
	console.log("uid : "+uid+" name : "+name+ " value : "+value)
	DBRemote.dbService.getPlayer(uid,name,function(data) {
		if(data != null){
			//console.log("data : "+data)
			//console.log('value :'+value)
			value = parseInt(data) + parseInt(value)
			//console.log('value :'+value)
			DBRemote.dbService.setPlayer(uid,name,value,cb)
		}else{
			if(cb){
				cb(false)
			}
		}
	})
}

DBRemote.prototype.getValue = function(uid,name,cb) {
	DBRemote.dbService.getPlayer(uid,name,cb)
}
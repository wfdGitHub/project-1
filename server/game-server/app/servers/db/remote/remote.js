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

var createAccount = function(uid) {
	DBRemote.dbService.setPlayer(uid,"diamond",10)
	DBRemote.dbService.setPlayer(uid,"nickname","name"+uid)
	DBRemote.dbService.setPlayer(uid,"score",0)
	DBRemote.dbService.setPlayer(uid,"head",0)
	DBRemote.dbService.setPlayer(uid,"uid",uid)
}


DBRemote.prototype.check = function(uid,cb) {
	DBRemote.dbService.getPlayer(uid,"uid",function(data) {
		console.log("data : "+data)
		if(!data){
			createAccount(uid)
			console.log("create ok!!")
		}
		if(cb){
			cb(true)
		}
	})
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
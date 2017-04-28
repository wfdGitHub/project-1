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
		if(data === false){
			createAccount(uid)
			console.log("create ok!!")
		}
		cb()
	})
}
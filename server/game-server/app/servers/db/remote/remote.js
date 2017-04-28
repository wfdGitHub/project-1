module.exports = function(app) {
	return new DBRemote(app);
};

var DBRemote = function(app) {
	this.app = app
    if(this.app.get('serverId') !== "db-server"){
        return
    }
    var db = require("../local/db.js")
}
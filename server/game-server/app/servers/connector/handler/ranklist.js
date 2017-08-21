var async = require('async')

module.exports = function(app) {
  return new Handler(app)
}

var Handler = function(app) {
  this.app = app
  Handler.app = app
  this.sessionService = this.app.get('sessionService')
  this.channelService = this.app.get('channelService')
}

var handler = Handler.prototype

handler.getRanklist = function(msg,session,next) {
	var self = this
	var uid = session.get("uid")
	if(!!uid){
		self.app.rpc.db.remote.getRanklist(session,function(data) {
			next(null,{flag : true,data : data})
		})
	}else{
		next(null,{flag : false})
	}
}
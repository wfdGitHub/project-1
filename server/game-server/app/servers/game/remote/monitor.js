module.exports = function(app) {
	return new Remote(app);
};

var Remote = function(app) {
	this.app = app;
	Remote.GameService = this.app.get("GameService")
};
var remote = Remote.prototype

remote.roomInfos = function(cb) {
	var roomList = new Array()
	for(var index in Remote.GameService.roomState){
		if(Remote.GameService.roomState.hasOwnProperty(index)){
			if(Remote.GameService.roomState[index] === false){
				var roomInfo = {
					"roomId" : index,
					"roomType" : Remote.GameService.roomList[index].roomType,
					"roomPlayer" : Remote.GameService.RoomMap[index]
				}
				roomList.push(roomInfo)
			}
		}
	}
	cb(roomList)
}

remote.getAgencyList = function(cb) {
	var data = Remote.GameService.agencyList
	if(cb){
		cb(data)		
	}
}

remote.finishRoom = function(roomId,cb) {
	if(Remote.GameService.roomState[roomId] === false){
		var params = {}
		params.gid = Remote.GameService.roomList[roomId]
		this.app.rpc.gameNode.remote.finishRoom(null,params,roomId,function (flag){
			cb(flag)
		})
	}
	cb(true)
}

remote.finishAllRoom = function(cb) {
	var roomList = new Array()
	for(var index in Remote.GameService.roomState){
		if(Remote.GameService.roomState.hasOwnProperty(index)){
			if(Remote.GameService.roomState[index] === false){
				var roomInfo = {
					"roomId" : index
				}
				roomList.push(roomInfo)
				var params = {}
				params.gid = Remote.GameService.roomList[index]
				this.app.rpc.gameNode.remote.finishRoom(null,params,index,function (flag){})
			}
		}
	}
	cb(roomList)
}

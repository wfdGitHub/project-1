module.exports = function(app) {
	return new Remote(app);
};

var Remote = function(app) {
	this.app = app;
	Remote.niuniuService = this.app.get("NiuNiuService")
};
var remote = Remote.prototype

remote.roomInfos = function(cb) {
	var roomList = new Array()
	for(var index in Remote.niuniuService.roomState){
		if(Remote.niuniuService.roomState.hasOwnProperty(index)){
			if(Remote.niuniuService.roomState[index] === false){
				var roomInfo = {
					"roomId" : index,
					"roomType" : Remote.niuniuService.roomList[index].roomType,
					"roomPlayer" : Remote.niuniuService.roomList[index].chairMap
				}
				roomList.push(roomInfo)
			}
		}
	}
	cb(roomList)
}




module.exports = function(app) {
	return new GameRemote(app);
};

var wawaRoom = {
	"0" : true,
	"1" : true,
	"2" : true,
	"3" : true,
	"4" : true,
	"5" : true,
	"6" : true
}

var GameRemote = function(app) {
	this.app = app
	GameRemote.app = app
	//房间信息表
	GameRemote.roomInfo = {}
	for(var index in wawaRoom){
		GameRemote.roomInfo[index] = {}
	}
	//玩家所在房间映射表
	GameRemote.userMap = {}
}


//获取房间数据
GameRemote.prototype.getRoomInfo = function(cb){
	var roomInfo = deepCopy(GameRemote.roomInfo)
	cb(roomInfo)
}

//加入房间
GameRemote.prototype.joinRoom = function(uid,cb) {
	GameRemote.app.rpc.db.remote.getPlayerInfoByUid(null,uid,function(data) {

	})
}



//离开房间

//抓娃娃




var deepCopy = function(source){
  var result={}
  for (var key in source) {
        result[key] = typeof source[key]==="object"? deepCopy(source[key]): source[key]
  } 
  return result;
}
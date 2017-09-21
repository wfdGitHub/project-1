module.exports = function(app) {
	return new Remote(app);
};

var Remote = function(app) {
	this.app = app;
	Remote.GameService = this.app.get("GameService")
	//红包列表
	Remote.redPacketList = {}
	//玩家红包映射表
	Remote.redPacketMap = {}
};
var remote = Remote.prototype


//生成红包
remote.createRedPacket = function(uid,value,cb) {
	if(typeof(value) != "number" || value <= 0){
		cb(false)
		return
	}
	var self = this
	//验证扣除钻石
	self.app.rpc.db.remote.getPlayerInfo(null,uid,function(data){
		if(data && data.diamond >= value){
			self.app.rpc.db.remote.setValue(null,uid,"diamond",-value,function(flag){
				if(flag){
					//生成红包
					var redPacketID = Math.floor((new Date()).getTime() + "" + Math.floor(Math.random() * 100000))
					var time = (new Date()).getTime()
					var info = {
						"id" : redPacketID,
						"value" : value,
						"createTime" : time,
						"state" : true,
						"createUser" : {"nickname" : data.nickname,"head" : data.head}
					}
					Remote.redPacketList[redPacketID] = info

					//记录玩家红包映射
					if(!Remote.redPacketMap[uid]){
						Remote.redPacketMap[uid] = {"sendList" : [],"receiveList" : []}
					}
					Remote.redPacketMap[uid].sendList.push(redPacketID)
					cb(deepCopy(info))
				}
				cb(flag)
			})
		}else{
			cb(false)
			return
		}
	})
}


//查询红包
remote.queryRedPacket = function(redId,cb) {
	if(Remote.redPacketList[redId]){
		cb(deepCopy(Remote.redPacketList[redId]))
	}else{
		cb(false)
	}
}

//领取红包
remote.drawRedPacket = function(uid,redId,cb) {
	//判断红包是否存在
	var self = this
	if(Remote.redPacketList[redId]){
		if(Remote.redPacketList[redId].state == true){
			//获取个人信息
			self.app.rpc.db.remote.getPlayerInfo(null,uid,function(data){
				//增加钻石
				self.app.rpc.db.remote.setValue(null,uid,"diamond",Remote.redPacketList[redId].value,function(flag){
					Remote.redPacketList[redId].state = false
					Remote.redPacketList[redId].receiveUser = {"nickname" : data.nickname,"head" : data.head}
					Remote.redPacketList[redId].receiveTime = (new Date()).getTime()

					//记录玩家红包映射
					if(!Remote.redPacketMap[uid]){
						Remote.redPacketMap[uid] = {"sendList" : [],"receiveList" : []}
					}
					Remote.redPacketMap[uid].receiveList.push(redId)
					cb(true)
				})
			})
		}else{
			//已领取则为查询
			remote.queryRedPacket(redId,cb)
		}
	}else{
		cb(false)
	}
}

//查询个人红包记录
remote.queryUserRed = function(uid,cb) {
	if(Remote.redPacketMap[uid]){
		var sendList = []
		var receiveList = []
		for(var i = 0;i < Remote.redPacketMap[uid].sendList.length;i++){
			sendList.push(deepCopy(Remote.redPacketList[Remote.redPacketMap[uid].sendList[i]]))
		}
		for(var i = 0;i < Remote.redPacketMap[uid].receiveList.length;i++){
			receiveList.push(deepCopy(Remote.redPacketList[Remote.redPacketMap[uid].receiveList[i]]))
		}
		cb({"sendList" : sendList,"receiveList" : receiveList})
	}else{
		cb({"sendList" : [],"receiveList" : receiveList})
	}
}



var deepCopy = function(source) { 
  var result={}
  for (var key in source) {
        result[key] = typeof source[key]==="object"? deepCopy(source[key]): source[key]
     } 
  return result;
}
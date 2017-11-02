var httpConf = require("../../../conf/httpModule.js")

module.exports = function(app) {
	return new DBRemote(app);
};

var DBRemote = function(app) {
	this.app = app
	DBRemote.app = app
    DBRemote.dbService = this.app.get("dbService")
    DBRemote.channelService = this.app.get('channelService')
    if(DBRemote.dbService && DBRemote.dbService.db){
    	DBRemote.db = DBRemote.dbService.db
    }
}

var createAccount = function(result,cb) {
	DBRemote.dbService.setUserId(result.unionid,function(playerId) {
		var uid = playerId
		DBRemote.dbService.setPlayer(uid,"diamond",10)
		DBRemote.dbService.setPlayer(uid,"nickname",result.nickname)
		DBRemote.dbService.setPlayer(uid,"head",result.headimgurl)
		DBRemote.dbService.setPlayer(uid,"uid",uid)
		DBRemote.dbService.setPlayer(uid,"sex",result.sex)
		DBRemote.dbService.setPlayer(uid,"limits",0)
		DBRemote.dbService.setPlayer(uid,"freeze",0)
		DBRemote.dbService.setPlayer(uid,"useDiamond",0)
		DBRemote.dbService.setPlayer(uid,"gold",0)
		DBRemote.dbService.setPlayer(uid,"contorl",0)
		DBRemote.dbService.setPlayer(uid,"clubLimit",0)
		//历史战绩
		var history = {}
		history.allGames = 0
		history.List = {}
		DBRemote.dbService.setPlayerObject(uid,"history",history)
		//每日刷新数据
		var refreshList = {}
		refreshList.shareTime = 0 					//分享领取奖励
		refreshList.shareCount = 0 					
		DBRemote.dbService.setPlayerObject(uid,"refreshList",refreshList)
        var tmpObj = {
        	"switch" : "false"
        }
        var cmd = "nn:acc:"+uid+":"+"clubList"
        //俱乐部成员列表
		DBRemote.dbService.db.hmset(cmd,tmpObj,function(){})
		cb(false)
	})
}
//每次登陆更新微信信息
var updateAccount = function(result) {
	var uid = result.playerId
	DBRemote.dbService.setPlayer(uid,"nickname",result.nickname)
	DBRemote.dbService.setPlayer(uid,"head",result.headimgurl)
	DBRemote.dbService.setPlayer(uid,"sex",result.sex)
}
//检查账号是否存在
DBRemote.prototype.check = function(result,cb) {
	//console.log("=================")
	//console.log("result.unionid : "+result.unionid)
	DBRemote.dbService.getPlayerString(result.unionid,"uidMap",function(data) {
		//console.log("data : "+data)
		if(!data){
			createAccount(result,cb)
			//console.log("create ok!!")
		}else{
			result.playerId = parseInt(data)
			updateAccount(result)
			if(cb){
				cb(true)
			}
		}
	})
}
DBRemote.prototype.getPlayerNickName = function(uid,cb) {
	DBRemote.dbService.getPlayerString(uid,"nickname",function(data){
		cb(data)
	})
}
//获取一个空闲ID
DBRemote.prototype.getPlayerId = function(cb) {
	DBRemote.dbService.db.get("nn:acc:lastid",function(err,data) {
		cb(data)
	})
} 

DBRemote.prototype.getPlayerInfoByUid = function(uid,cb) {
	DBRemote.dbService.getPlayerInfoByUid(uid,cb)
}

DBRemote.prototype.getPlayerInfo = function(uid,cb) {
	DBRemote.dbService.getPlayerInfo(uid,cb)
}
DBRemote.prototype.getNotify = function(cb) {
	DBRemote.dbService.getNotify(cb)
}
DBRemote.prototype.updateDiamond = function(value,cb) {
	DBRemote.dbService.updateDiamond(value)
	cb()
}
DBRemote.prototype.updateNotify = function(notify,source,cb) {
	DBRemote.dbService.getNotify(function(data) {
		console.log(data)
		if(!data[source]){
			data[source] = {}
			data[source].name = ""
		}
		data[source].content = notify
		DBRemote.dbService.setNotify(data)
		//更新公告完通知所有玩家
		DBRemote.channelService.broadcast("connector","onNotify",{"type":"notify","data":data})
		if(cb){
			cb(true)
		}
	})
}
//改变俱乐部开启开关
DBRemote.prototype.clubSwitch = function(uid,flag,cb) {
	var cmd = "nn:acc:"+uid+":"+"clubList"
	DBRemote.dbService.db.hset(cmd,"switch",flag,function(err,value) {
		if(!err){
			cb(true)
		}
	})
}
//获取俱乐部成员列表
DBRemote.prototype.getClubList = function(uid,cb) {
    var cmd = "nn:acc:"+uid+":"+"clubList"
    //俱乐部成员列表
	DBRemote.dbService.db.hgetall(cmd,function(err,data){
		if(err){
			cb(false)
		}else{
			cb(data)
		}
	})
}
//添加俱乐部成员
DBRemote.prototype.addClubPlayer = function(uid,playerId,cb) {
	 DBRemote.dbService.getPlayerInfoByUid(playerId,function(data) {
	 	if(data && playerId == data.playerId){
		 	var tmpInfo = {
		 		"uid" : data.uid,
		 		"head" : data.head,
		 		"nickname" : data.nickname
		 	}
	 		var cmd = "nn:acc:"+uid+":"+"clubList"
 			DBRemote.dbService.db.hset(cmd,playerId,JSON.stringify(tmpInfo),function(err,value) {
 				if(value == 1){
 					cb(tmpInfo)
 				}else{
 					cb(false)
 				}
 			})
	 	}else{
	 		cb(false)
	 	}
	 })
}
//删除俱乐部成员
DBRemote.prototype.removePlayer = function(uid,playerId,cb) {
	var cmd = "nn:acc:"+uid+":"+"clubList"
	DBRemote.dbService.db.hdel(cmd,playerId,function(err,value) {
		if(value == 1){
			cb(true)
		}else{
			cb(false)
		}
	})
}
//判断playerid玩家是否可加入uid玩家开的房间  返回true代表可加入，false代表不可加入
DBRemote.prototype.checkClubLimit = function(uid,playerId,cb) {
	if(uid == playerId){
		cb(true)
		return
	}
	DBRemote.dbService.getPlayer(uid,"clubLimit",function(data) {
		if(data < 1){
			//未开启俱乐部权限所有人可加入
			cb(true)
			return
		}
		var cmd = "nn:acc:"+uid+":"+"clubList"
		//查询是否开启仅俱乐部成员可加入
		DBRemote.dbService.db.hget(cmd,"switch",function(err,value) {
			if(err || value == "false"){
				cb(true)
				return
			}
			//查询成员是否在列表中
			DBRemote.dbService.db.hexists(cmd,playerId,function(err,value) {
				if(value == true){
					cb(true)
				}else{
					cb(false)
				}
			})
		})		
	})
}


DBRemote.prototype.setValue = function(uid,name,value,cb) {
	//console.log("uid : "+uid+" name : "+name+ " value : "+value)
	var cmd = "nn:acc:"+uid+":"+name
	var oldValue = parseInt(value)
	if(!oldValue){
		cb(false)
		return
	}	
	DBRemote.dbService.db.incrby(cmd,oldValue,function(err,value) {
		if(err){
			console.log(err)
			cb(false)
			return
		}
		if(value < 0){
			//小于0归0
			console.log("error set db value < 0")
			value = 0
			DBRemote.dbService.db.set(cmd,0)
		}
		cb(true)
		if(name === "diamond"){
			//通知钻石更新
			var notify = {
				"cmd" : "updateDiamond",
				"data" : value
			}
			DBRemote.app.rpc.game.remote.sendByUid(null,uid,notify,function(){})		
			//通知后台
			httpConf.sendDiamondHttp(uid,oldValue,value,oldValue > 0 ? "inc" : "dec")				
		}						
	})
}

DBRemote.prototype.changeValue = function(uid,name,value,cb) {
	DBRemote.dbService.setPlayer(uid,name,value,cb)
}
//设置战绩
DBRemote.prototype.setHistory = function(uid,record,cb) {
	// console.log("uid : "+uid)
	// console.log(record)
	DBRemote.dbService.getHistory(uid,function(data) {
		// console.log("data : ")
		// console.log(data)
		data.allGames += 1
		for(var i = 9;i > 0;i--){
			if(data.List[i - 1]){
				data.List[i] = data.List[i - 1]
			}
		}
		data.List[0] = record
		DBRemote.dbService.setHistory(uid,data)
		//通知战绩更新
		var notify = {
			"cmd" : "updateHistory",
			"data" : data
		}
		DBRemote.app.rpc.game.remote.sendByUid(null,uid,notify,function(){})
		if(cb){
			cb()
		}
	})
}
//设置代开房记录
// DBRemote.prototype.setAgencyRoom = function(uid,agencyRoom,cb) {
// 	DBRemote.dbService.getAgencyRoom(uid,function(data) {
// 		for(var i = 9;i > 0;i--){
// 			if(data.List[i - 1]){
// 				data.List[i] = data.List[i - 1]
// 			}
// 		}
// 		data.List[0] = agencyRoom
// 		DBRemote.dbService.setAgencyRoom(uid,data)
// 		if(cb){
// 			cb()
// 		}
// 	})
// }

//更新代开房记录
// DBRemote.prototype.updateAgencyRoom = function(uid,agencyRoom,cb) {
// 	DBRemote.dbService.getAgencyRoom(uid,function(data) {
// 		for(var i = 9;i >= 0;i--){
// 			if(data.List[i]){
// 				//找到并修改代开房记录
// 				if(data.List[i].roomId === agencyRoom.roomId){
// 					data.List[i] = agencyRoom
// 					DBRemote.dbService.setAgencyRoom(uid,data)
// 					if(cb){
// 						cb()
// 					}
// 					return
// 				}
// 			}
// 		}
// 		if(cb){
// 			cb()
// 		}
// 	})
// }
//获取代开房信息记录
// DBRemote.prototype.getAgencyRoom = function(uid,cb) {
// 	DBRemote.dbService.getAgencyRoom(uid,function(data) {
// 		cb(data)
// 	})
// }


DBRemote.prototype.getValue = function(uid,name,cb) {
	DBRemote.dbService.getPlayer(uid,name,cb)
}


//检查游戏开关
DBRemote.prototype.checkGameSwitch = function(type,cb) {
	DBRemote.dbService.db.get("nn:game:switch",function(err,data) {
		if(!data){
			cb(true)
			return
		}
		var tmpData = JSON.parse(data)
		if(tmpData[type] != undefined  && tmpData[type] == false){
			cb(false)
		}else{
			cb(true)
		}
	})
}
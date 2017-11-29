var async = require("async")
var itemConf = require("../../../conf/item.js")
module.exports = function(app) {
	return new GameRemote(app);
};

//房间ID  也是产出物品ID 
var wawaRoom = {
	"1001" : true,
	"1002" : true,
	"1003" : true,
	"1004" : true,
	"1005" : true,
	"1006" : true
}

var GameRemote = function(app) {
	this.app = app
	GameRemote.app = app
	//房间信息表
	GameRemote.roomInfo = {}
	for(var index in wawaRoom){
		GameRemote.roomInfo[index] = {}
	}
	GameRemote.dbService = this.app.get("dbService")
    if(GameRemote.dbService && GameRemote.dbService.db){
    	GameRemote.db = GameRemote.dbService.db
    }
    GameRemote.userConnectorMap = {}
	//玩家所在房间映射表
	GameRemote.userMap = {}
}
var local = {}

//用户连接
GameRemote.prototype.userConnect = function(uid,sid,cb) {
	uid = parseInt(uid)
	GameRemote.userConnectorMap[uid] = sid
	if(cb){
		cb()
	}
}

GameRemote.prototype.receive = function(uid, sid,code,params,cb) {
	console.log(params)
	uid = parseInt(uid)
	var self = this
	switch(code){
		case "getRoomInfo" :
			local.getRoomInfo(cb)
		return
		case "joinRoom" :
			var roomId = parseInt(params.roomId)
			local.joinRoom(uid,roomId,cb)
		return
		case "leave" :
			local.leave(uid,cb)
		return
		case "catch":
			local.catch(uid,params.target,cb)
		return
		default : 
			cb(false)
		return
	}
}



//获取房间数据
local.getRoomInfo = function(cb){
	var roomInfo = deepCopy(GameRemote.roomInfo)
	cb(true,roomInfo)
}

//加入房间
local.joinRoom = function(uid,roomId,cb) {
	if(!wawaRoom[roomId]){
		cb(false)
		return
	}
	local.leaveRoom(uid)
	GameRemote.app.rpc.db.remote.getPlayerInfoByUid(null,uid,function(data) {
		console.log(data)
		if(data){
			GameRemote.userMap[uid] = roomId
			var info = {
				"uid" : data.uid,
				"nickname" : data.nickname,
				"head" : data.head
			}
			GameRemote.roomInfo[roomId][uid] = data
			cb(true)
		}else{
			cb(false)
		}
	})
}

GameRemote.prototype.leave = function(uid,cb) {
	local.leaveRoom(uid)
	cb(true)	
}

//离开房间
local.leave = function(uid,cb) {
	local.leaveRoom(uid)
	cb(true)
}

local.leaveRoom = function(uid) {
	if(GameRemote.userMap[uid]){
		var roomId = GameRemote.userMap[uid]
		delete GameRemote.roomInfo[roomId][uid]
		delete GameRemote.userMap[uid]
	}
}

//抓娃娃
local.catch = function(uid,target,cb) {
	var self = this
	var roomId = GameRemote.userMap[uid]
	if(!roomId){
		cb(false)
		return
	}
	var RoomRand = 0
	var useGold = 0
	async.waterfall([
		function(next) {
			console.log("roomId ： "+roomId)
			//获取消耗值
			GameRemote.dbService.db.hget("nn:consume",roomId,function(err,data) {
				console.log(data)
				console.log(typeof(data))
				data = parseInt(data)
				if(err || !data || typeof(data) != "number" || data <= 0){
					console.log("获取消耗值失败")
					cb(false)
					return
				}
				useGold = data
				next()
			})
		},
		function(next) {
			//获取玩家金钱
			GameRemote.app.rpc.db.remote.getValue(null,uid,"gold",function(data) {
				console.log(data)
				console.log(typeof(data))
				data = parseInt(data)				
				if(!data || typeof(data) != "number" || data < useGold){
					console.log("玩家金钱不足 : "+data)
					cb(false)
					return
				}
				GameRemote.app.rpc.db.remote.incrbyPlayer(null,uid,"gold",-useGold,function(data) {
					if(data){
						next()
					}else{
						console.log("111111")
						cb(false)
						return
					}
				})
			})
		},
		function(next) {
			//获取概率
			GameRemote.dbService.db.hget("nn:wawajiConctorl",roomId,function(err,data) {
				console.log(data)
				console.log(typeof(data))
				data = parseFloat(data)
				if(err || !data || typeof(data) != "number" || data <= 0){
					console.log("概率错误")
					RoomRand = 0
				}else{
					RoomRand = data
				}
				next()
			})
		},
		function(next) {
			//获取库存
			GameRemote.dbService.db.hget("nn:inventory",roomId,function(err,data) {
				console.log(data)
				console.log(typeof(data))
				data = parseInt(data)				
				if(err || !data || typeof(data) != "number" || data <= 0){
					console.log("库存不足")
					RoomRand = 0
				}
				next()
			})
		},
		function() {
			//计算抓中概率
			var tmpRand = Math.random()
			if(target === true && tmpRand < RoomRand){
				//抓中
				GameRemote.app.rpc.db.remote.addItem(null,uid,roomId,function(flag) {
					if(flag){
						GameRemote.dbService.db.hincrby("nn:inventory",roomId,-1,function(err){})						
					}
					cb(flag,{"item" : itemConf[roomId]})
				})
			}else{
				console.log("1111112222")
				//没抓中
				cb(false)
			}
		}
	],function(err,result) {
      console.log("enter error")
      console.log(err)
      console.log(result)
      next(null,{"flag" : false,code : -200})
      return
    })
}

//通知玩家
GameRemote.prototype.sendByUid = function(uid,notify,cb){
	uid = parseInt(uid)
	var params = {}
	params.cid = GameRemote.userConnectorMap[uid]
	if(params.cid){
		GameRemote.app.rpc.connector.remote.sendByUid(null,params,uid,notify,function(){})
	}
	cb()
}

var deepCopy = function(source){
  var result={}
  for (var key in source) {
        result[key] = typeof source[key]==="object"? deepCopy(source[key]): source[key]
  }
  return result;
}
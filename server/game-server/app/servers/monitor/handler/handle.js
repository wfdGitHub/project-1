var async = require("async")
var http=require("http");
var diamondLogger = require("pomelo-logger").getLogger("diamond-log");
var giveDiamondLogger = require("pomelo-logger").getLogger("giveDiamond-log");
var httpConf = require("../../../conf/httpModule.js")

module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
	this.app = app
	Handler.app = app
	Handler.channelService = this.app.get('channelService')
	if(app.get("serverId") === "connector-server-1"){
	http.createServer(function(req,res){
		//console.log(req)
	    res.writeHead(200,{
	        "content-type":"text/plain"
	    });    
        if (req.method.toUpperCase() == 'POST') {
			//console.log("post")
            var postData = "";
			//接收数据中
            req.addListener("data", function (data) {
                postData += data;
            });
			//接收数据完毕
			req.addListener("end", function () {
				var data=JSON.parse(postData);
                //console.log(data)
				switch(data.cmd){
					case "addDiamond" : 
						local.addDiamond(data.diamond,data.uid,function(flag) {
							if(flag){
								local.write(res,{"flag" : true})
							}else{
								local.write(res,{"flag" : false})
							}
						})
					return
					case "queryUserInfo" : 
						local.getUserInfo(data.uid,function(data) {
							if(data == false){
								local.write(res,{"flag" : false})
							}else{
								local.write(res,{"flag" : true,"userInfo" : data})
							}
						})
					return
					case "setAgency" : 
						local.setAgency(data.uid,function(flag) {
							if(flag){
								local.write(res,{"flag" : true})
							}else{
								local.write(res,{"flag" : false})
							}
						})
					return
					case "setFreeze" : 
						local.freezeAccount(data.uid,data.freeze,function(flag) {
							if(flag){
								local.write(res,{"flag" : true})
							}else{
								local.write(res,{"flag" : false})
							}
						})
					return
					case "updateNotify" :
						local.updateNotify(data.notify,data.source,function(flag) {
							if(flag){
								local.write(res,{"flag" : true})
							}else{
								local.write(res,{"flag" : false})
							}
						})
					return
					case "addRolling" :
						if(typeof(data.content) !== "string" || typeof(data.count) !== "number" || data.count <= 0 || data.count > 1000){
							local.write(res,{"flag" : false})
							return
						}
						var rolling = {
							"type" : "rolling",
							"count" : data.count,
							"content" : data.content
						}
						Handler.channelService.broadcast("connector","onNotify",rolling)
						local.write(res,{"flag" : true})
					return
					case "getRooms" :
						local.getRooms(function(data) {
							local.write(res,data)
						})
					return
					default :
						local.write(res,{"flag" : false})
						break
				}
            });
        }
        else if (req.method.toUpperCase() == 'GET') {
			console.log("get")
        }
	}).listen(20279, function () {
	    console.log("listen on port 20279");
	});			
	}

};

var handler = Handler.prototype;

handler.getOnlineUser = function(msg,session,next) {
	var notify = {
		"test" : "true"
	}
	next(null,notify)
}
var local = {}
//回发消息
local.write = function(res,notidy) {
	res.write(JSON.stringify(notidy))
	res.end()
}


//获取房间列表
local.getRooms = function(cb) {
	Handler.app.rpc.game.monitor.roomInfos(null,function(data) {
		console.log(data)
		cb(data)
	})
}


//更新公告
local.updateNotify = function(notify,source,cb){
	console.log(notify)
	if(typeof(notify) !== "string" || typeof(source) !== "number"){
		cb(false)
		return
	}
	Handler.app.rpc.db.remote.updateNotify(null,notify,source,cb)
}

//添加钻石
local.addDiamond = function(diamond,uid,cb) {
	if(!diamond || typeof(diamond) != "number"){
		cb(null,{"flag" : false})
	}
	async.waterfall([
	function(next) {
		//查询用户是否存在
		Handler.app.rpc.db.remote.getValue(null,uid,"uid",function(data) {
			if(uid === data){
				//玩家存在
				next()
			}else{
				//玩家不存在
				cb(false)
			}
		})	
	},
	function() {
		//添加钻石
		Handler.app.rpc.db.remote.setValue(null,uid,"diamond",diamond,function(flag) {
			if(flag == true){
				//记录充值 
				Handler.app.rpc.db.remote.updateDiamond(null,diamond,function(flag) {})	  
				var info = "     uid : "+uid+"   diamond : "+diamond
				//记录充值
				diamondLogger.info(info);	
				if(diamond >= 0){
					httpConf.coinChangeRecord(uid,3,diamond)
				}else{
					httpConf.coinChangeRecord(uid,2,diamond)
				}
				
				cb(true)
			}else{
				cb(false)
			}
		})	
	}
	],
	function(err,result) {
		console.log(err)
		console.log(result)
		cb(null)
		return
})
 
}
//设置代理  开启赠送钻石权限
local.setAgency = function(uid,cb){
	if(!uid || typeof(uid) != "number" || uid < 0){
		cb(false)
		return 
	}
	async.waterfall([
		function(next) {
			//查询用户是否存在
			Handler.app.rpc.db.remote.getValue(null,uid,"uid",function(data) {
				if(uid === data){
					//玩家存在
					next()
				}else{
					//玩家不存在
					cb(false)
				}
			})	
		},
		function() {
			//设置代理权限
			Handler.app.rpc.db.remote.changeValue(null,uid,"limits",1,function(flag){
				var info = "  setAgency    uid : "+uid
				giveDiamondLogger.info(info)
				cb(flag)
			})	
		}
		],
		function(err,result) {
			console.log(err)
			console.log(result)
			next(null)
			return
	})
}
//查询玩家信息
local.getUserInfo = function(uid,cb) {
	if(!uid || typeof(uid) != "number" || uid < 0){
		cb(false)
		return 
	}
	async.waterfall([
		function(next) {
			//查询用户是否存在
			Handler.app.rpc.db.remote.getValue(null,uid,"uid",function(data) {
				if(uid === data){
					//玩家存在
					next()
				}else{
					//玩家不存在
					cb(false)
				}
			})	
		},
		function() {
			//查询并返回用户信息
			Handler.app.rpc.db.remote.getPlayerInfoByUid(null,uid,function(data) {
				data.uid = data.playerId
				delete data.playerId
				cb(data)
			})
		}
		],
		function(err,result) {
			console.log(err)
			console.log(result)
			next(null)
			return
	})	

}
//查询钻石
handler.queryDiamond = function(msg,session,next){
	var uid = msg.uid
	if(!uid || typeof(uid) != "number" || uid < 0){
		next(false)
		return 
	}		
	async.waterfall([
		function(cb) {
			//查询用户是否存在
			Handler.app.rpc.db.remote.getValue(null,uid,"uid",function(data) {
				if(uid === data){
					//玩家存在
					cb()
				}else{
					//玩家不存在
					next(false)
				}
			})	
		},
		function() {
			//获取玩家钻石
			this.app.rpc.db.remote.getValue(null,uid,"diamond",function(data){
				next(null,data)
			})
		}
		],
		function(err,result) {
			console.log(err)
			console.log(result)
			next(null)
			return
	})		

}
//查询昵称
handler.queryNickName = function(msg,session,next) {
	var uid = msg.uid
	if(!uid || typeof(uid) != "number" || uid < 0){
		next(null,{"flag" : false})
		return 
	}	

	async.waterfall([
		function(cb) {
			//查询用户是否存在
			Handler.app.rpc.db.remote.getValue(null,uid,"uid",function(data) {
				if(uid === data){
					//玩家存在
					cb()
				}else{
					//玩家不存在
					next(null,{"flag" : false})
				}
			})	
		},
		function() {
			//查询玩家昵称
			Handler.app.rpc.db.remote.getPlayerNickName(null,uid,function(data) {
				if(data){
					next(null,data)
				}else{
					next(null,{"flag" : false})
				}
				
			})
		}
		],
		function(err,result) {
			console.log(err)
			console.log(result)
			next(null,{"flag" : false})
			return
	})		

}
//赠送钻石接口 
handler.giveDiamond = function(msg,session,next){
	var target = msg.target
	var diamond = msg.diamond
	var uid = session.get("uid")
	if(!target || typeof(target) != "number" || target < 0){
		next(null,"没有这个玩家")
		return 
	}
	if(!diamond || typeof(diamond) != "number" || diamond <= 0){
		next(null,"钻石数量错误")
		return
	}
	if(!uid || uid == target){
		next(null)
		return
	}
	var limits = 0
	async.waterfall([
		function(cb) {
			//查询权限
			Handler.app.rpc.db.remote.getValue(null,uid,"limits",function(data){
				limits = data
				if(data >= 1){
					cb()
				}else{
					next(null,"未开启赠送权限")
				}
			})	
		},
		function(cb) {
			//查询目标是否存在
			Handler.app.rpc.db.remote.getValue(null,target,"uid",function(data) {
				if(target === data){
					//玩家存在
					cb()
				}else{
					//玩家不存在
					next(null,"该玩家不存在")
				}
			})
		},
		function(cb){
			if(limits > 1){
				cb()
			}else{
				//只能赠送给代理旗下用户
			  	var req=http.request("http://pay.5d8d.com/niu_admin.php/api/userBelongAgent?game_uid="+target+"&agent_uid="+uid,function(res){
					var temp = ""
					res.on("data",function(chunk){
					temp += chunk
					})
					res.on("end",function(){
						temp = JSON.parse(temp)
						if(temp.flag === true ){
							cb()
						}else{
							next(null,"该用户非您发展，不能赠送")
						}
					})
		  		})
	  			req.end()				
			}
		},
		function(cb) {
			//查询赠送人钻石
			Handler.app.rpc.db.remote.getValue(null,uid,"diamond",function(value) {
				if(value >= diamond){
					cb()
				}else{
					next(null,{"flag" : false})
				}
			})	 			
		},		
		function(cb) {
			//扣除赠送人钻石
			Handler.app.rpc.db.remote.setValue(null,uid,"diamond",-diamond,function(flag) {
				if(flag == true){
					cb()
					httpConf.coinChangeRecord(uid,4,-diamond)
				}else{
					next(null,{"flag" : false})
				}
			})	 			
		},
		function(cb) {
			//增加目标钻石
			Handler.app.rpc.db.remote.setValue(null,target,"diamond",diamond,function(flag) {
				if(flag == true){
					next(null,{"flag" : true})
					var info = "  giveDiamond    uid : "+uid+"    target : "+target+"  diamond : "+diamond
					giveDiamondLogger.info(info)
					httpConf.coinChangeRecord(target,5,diamond)
				}else{
					//失败则把赠送人钻石加回来
					Handler.app.rpc.db.remote.setValue(null,uid,"diamond",diamond,function(flag) {
						next(null,{"flag" : false})
					})
				}
			})	 			
		}
		],
		function(err,result) {
				console.log(err)
				console.log(result)
				next(null)
				return
	})
}



//封号
local.freezeAccount = function(uid,freeze,cb) {
	if(!uid || typeof(uid) != "number" || uid < 0){
		cb(false)
		return 
	}	
	async.waterfall([
		function(next) {
			//查询用户是否存在
			Handler.app.rpc.db.remote.getValue(null,uid,"uid",function(data) {
				if(uid === data){
					//玩家存在
					next()
				}else{
					//玩家不存在
					cb(false)
				}
			})	
		},
		function() {
			//设置冻结状态
			if(freeze == 0 || freeze == 1){
				//设置冻结状态
				Handler.app.rpc.db.remote.changeValue(null,uid,"freeze",freeze,function(flag){
					var info = "    freezeAccount   uid : "+uid+"    freeze : "+freeze
					giveDiamondLogger.info(info)
					cb(flag)
				})	
			}else{
				cb(false)
			}
		}
		],
		function(err,result) {
			console.log(err)
			console.log(result)
			next(null)
			return
	})	
}
var async = require("async")
var http=require("http")
var diamondLogger = require("pomelo-logger").getLogger("diamond-log")
var goldLogger = require("pomelo-logger").getLogger("gold-log")
var giveDiamondLogger = require("pomelo-logger").getLogger("giveDiamond-log")
var managerLogger = require("pomelo-logger").getLogger("manager-log")

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
                console.log(data)
				managerLogger.info("begin : "+JSON.stringify(data))
				switch(data.cmd){
					case "addDiamond" : 
						local.addDiamond(data.diamond,data.uid,data.RMB,function(flag) {
							if(flag){
								managerLogger.info(JSON.stringify(data))
								local.write(res,{"flag" : true})
							}else{
								local.write(res,{"flag" : false})
							}
						})
					return
					case "addGold" :
						local.addGold(data.gold,data.uid,function(flag) {
							if(flag){
								managerLogger.info(JSON.stringify(data))
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
								managerLogger.info(JSON.stringify(data))
								local.write(res,{"flag" : true,"userInfo" : data})
							}
						})
					return
					case "setAgency" : 
						local.setAgency(data.uid,function(flag) {
							if(flag){
								managerLogger.info(JSON.stringify(data))
								local.write(res,{"flag" : true})
							}else{
								local.write(res,{"flag" : false})
							}
						})
					return
					case "setFreeze" : 
						local.freezeAccount(data.uid,data.freeze,function(flag) {
							if(flag){
								managerLogger.info(JSON.stringify(data))
								local.write(res,{"flag" : true})
							}else{
								local.write(res,{"flag" : false})
							}
						})
					return
					case "updateNotify" :
						local.updateNotify(data.notify,data.source,function(flag) {
							if(flag){
								managerLogger.info(JSON.stringify(data))
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
						managerLogger.info(JSON.stringify(data))
						local.write(res,{"flag" : true})
					return
					case "bindAgency" :
						var uid = data.uid
						var agencyId = data.agencyId
						if(!uid || !agencyId || typeof(uid) != "number" || typeof(agencyId) != "number" || uid < 0 || agencyId < 0 || uid == agencyId){
							local.write(res,{"flag" : false})
							return
						}
						local.bindAgency(uid,agencyId,function(flag) {
							if(flag){
								managerLogger.info(JSON.stringify(data))
								local.write(res,{"flag" : true})
							}else{
								local.write(res,{"flag" : false})
							}
						})
					return
					case "sendMail" :
						var uid = data.uid
						var mailInfo = data.mailInfo
						if(!uid || typeof(uid) != "number" || uid < 10001){
							local.write(res,{"flag" : false})
							return
						}
						local.sendMail(uid,mailInfo,function(flag) {
							if(flag){
								managerLogger.info(JSON.stringify(data))
								local.write(res,{"flag" : true})
							}else{
								local.write(res,{"flag" : false})
							}
						})
					return
					default :
						local.write(res,{"flag" : false})
						break
				}
            })
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
//发邮件
local.sendMail = function(uid,mailInfo,cb) {
	if(!mailInfo.title || typeof(mailInfo.title) != "string"){
		mailInfo.title = "系统邮件"
	}
	if(!mailInfo.content || typeof(mailInfo.content) != "string"){
		mailInfo.content = "系统邮件"
	}
	if(mailInfo.affix){
		if(mailInfo.affix.type !== "gold" && mailInfo.affix.type !== "diamond"){
			cb(false)
			return
		}
		if(!mailInfo.affix.value || typeof(mailInfo.affix.value) != "number" || mailInfo.affix.value <= 0){
			cb(false)
			return
		}
	}else{
		mailInfo.affix = false
	}
	Handler.app.rpc.db.remote.sendMail(null,uid,mailInfo.title,mailInfo.content,mailInfo.affix,"系统管理员",0,function() {
		cb(true)
	})
}

//绑定代理
local.bindAgency = function(uid,agencyId,cb) {
	//查询用户是否存在
	async.waterfall([
		function(next) {
			//查询用户是否存在
			Handler.app.rpc.db.remote.getValue(null,uid,"uid",function(data) {
				console.log("111111111111")
				if(uid === data){
					//玩家存在
					next()
				}else{
					//玩家不存在
					cb(false)
				}
			})	
		},
		function(next) {
			//查询代理是否存在
			Handler.app.rpc.db.remote.getValue(null,agencyId,"limits",function(value) {
				console.log("2222222222")
				if(value && value >= 1){
					next()
				}else{
					cb(false)
				}
			})	
		},
		function() {
			//绑定代理
			Handler.app.rpc.db.remote.changeValue(null,uid,"agencyId",agencyId,function() {
				console.log("33333333")
				cb(true)
			})
		}
	],
	function(err,result) {
		console.log(err)
		console.log(result)
		cb(false)
		return
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
//添加金币
local.addGold = function(gold,uid,cb) {
	if(!gold || typeof(gold) != "number"){
		cb(null,{"flag" : false})
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
		//添加钻石
		Handler.app.rpc.db.remote.setValue(null,uid,"gold",gold,function(flag) {
			if(flag == true){
				var info = "     uid : "+uid+"   gold : "+gold
				//记录充值
				goldLogger.info(info);
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
//添加钻石
local.addDiamond = function(diamond,uid,RMB,cb) {
	if(!diamond || typeof(diamond) != "number"){
		cb(null,{"flag" : false})
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
		//添加钻石
		Handler.app.rpc.db.remote.setValue(null,uid,"diamond",diamond,function(flag) {
			if(flag == true){
				//记录充值 
				Handler.app.rpc.db.remote.updateDiamond(null,diamond,function(flag) {})	  
				var info = "     uid : "+uid+"   diamond : "+diamond
				//记录充值
				diamondLogger.info(info);
				//记录充值记录
				if(RMB && typeof(RMB) == "number"){
					Handler.app.rpc.db.remote.getPlayerObject(null,uid,"rechargeRecord",function(data) {
						if(data){
							data.allValue += RMB
							data.curValue += RMB
							console.log(data)
							Handler.app.rpc.db.remote.setPlayerObject(null,uid,"rechargeRecord",data,function(){})
						}
					})
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
			//扣除赠送人钻石
			Handler.app.rpc.db.remote.setValue(null,uid,"diamond",-diamond,function(flag) {
				if(flag == true){
					cb()
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
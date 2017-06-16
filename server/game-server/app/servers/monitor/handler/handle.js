var async = require("async")
var http=require("http");
var url = require("url")
var qs = require('querystring')
http.createServer(function(req,res){
	//console.log(req)
    res.writeHead(200,{
        "content-type":"text/plain"
    });    
     if (req.method.toUpperCase() == 'POST') {
			console.log("post")
            var postData = "";
			//接收数据中
            req.addListener("data", function (data) {
                postData += data;
            });
			//接收数据完毕
			req.addListener("end", function () {
				var data=JSON.parse(postData);
                console.log(data)
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


module.exports = function(app) {
	return new Handler(app);
};

var Handler = function(app) {
	this.app = app
	Handler.app = app
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
//添加钻石
local.addDiamond = function(diamond,uid,cb) {
	if(!diamond || typeof(diamond) != "number"){
		next(null,{"flag" : false})
	}
	Handler.app.rpc.db.remote.setValue(null,uid,"diamond",diamond,function(flag) {
		if(flag == true){
			cb(true)
		}else{
			cb(false)
		}
	})	    		
}

//查询钻石
handler.queryDiamond = function(msg,session,next){
	var uid = msg.uid
	//获取玩家钻石
	this.app.rpc.db.remote.getValue(null,uid,"diamond",function(data){
		next(null,data)
	})
}
//查询昵称
handler.queryNickName = function(msg,session,next) {
	var uid = msg.uid
	this.app.rpc.db.remote.getPlayerString(null,uid,"nickname",function(data) {
		next(null,data)
	})
}
//赠送钻石
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
	if(!uid || uid === target){
		next(null)
		return
	}
	async.waterfall([
		function(cb) {
			//查询权限
			this.app.rpc.db.remote.getValue(null,uid,"limits",function(data){
				if(data >= 1){
					cb()
				}else{
					next(null,"未开启赠送权限")
				}
			})	
		},
		function(cb) {
			//查询目标是否存在
			this.app.rpc.db.remote.getValue(null,target,"uid",function(data) {
				if(target === data){
					//玩家存在
					cb()
				}else{
					//玩家不存在
					next(null,"玩家不存在")
				}
			})
		},
		function(cb) {
			//扣除赠送人钻石
			this.app.rpc.db.remote.setValue(null,uid,"diamond",-diamond,function(flag) {
				if(flag == true){
					cb()
				}else{
					next(null,{"flag" : false})
				}
			})	 			
		},
		function(cb) {
			//增加目标钻石
			this.app.rpc.db.remote.setValue(null,target,"diamond",diamond,function(flag) {
				if(flag == true){
					next(null,{"flag" : true})
				}else{
					//失败则把赠送人钻石加回来
					this.app.rpc.db.remote.setValue(null,uid,"diamond",diamond,function(flag) {
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

//开启赠送钻石权限
handler.unfreezeLimit = function(msg,session,next){
	this.app.rpc.db.remote.setValue(null,uid,"limits",1,function(flag){
		next(null,{"flag" : flag})
	})	
}

//封号
handler.freezeAccount = function(msg,session,next) {
	
}
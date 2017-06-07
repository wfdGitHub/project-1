module.exports = function(app) {
	return new remote(app);
};

var remote = function(app) {
	this.app = app;
	// this.channelService = app.get('channelService');
};

var https=require('https');  

remote.prototype.checkUser = function checkUser(msg,cb) {
	var callBack = cb
	var openId = msg.openId
  	var token = msg.token
	var url = "https://api.weixin.qq.com/sns/userinfo?access_token="+token+"&openid="+openId
	//console.log(url)
	https.get(url,function(req,res){  
	    var html='';  
	    req.on('data',function(data){  
			if(data.errcode){
				console.log("errcode : "+data.errcode)
				console.log("errmsg : "+data.errmsg)
				callBack(false)
			}else{
				var result = JSON.parse(data)
				//console.log(result)
				callBack(result)
			}
	    });  
	});  
}



const SMSClient = require('@alicloud/sms-sdk')
const accessKeyId = 'LTAI3fa66E4b1lDb'
const secretAccessKey = 'VJGPJLNScbhvFbEJV228NeDYPGb7y2'

module.exports = function(app) {
	return new Remote(app);
};

var Remote = function(app) {
	this.app = app;
	Remote.GameService = this.app.get("GameService")
	//验证码列表
	Remote.captchaList = {}
	Remote.smsClient = new SMSClient({accessKeyId, secretAccessKey})
};
var remote = Remote.prototype


//请求发送验证码
remote.sendCaptcha = function(uid,phone,cb) {
	var tmpCode = Math.floor(Math.random() * 8999) + 1000
	//发送短信
	Remote.smsClient.sendSMS({
	    PhoneNumbers: phone,
	    SignName: '大番薯',
	    TemplateCode: 'SMS_97880040',
	    TemplateParam: JSON.stringify({"code" : tmpCode , "product" : "大番薯"})
	}).then(function (res) {
	    let {Code}=res
	    if (Code === 'OK') {
	        //处理返回参数
	        // console.log(res)
	        Remote.captchaList[uid] = {"code" : tmpCode,"phone" : phone}
	        cb(true)
	    }
	}, function (err) {
	    // console.log(err)
	    cb(false)
	})
}


//确认验证码绑定手机
remote.bindPhone = function(uid,code,cb) {
	if(Remote.captchaList[uid]){
		if(Remote.captchaList[uid] && Remote.captchaList[uid].code == code){
			//绑定手机
			this.app.rpc.db.remote.setValue(null,uid,"phone",Remote.captchaList[uid].phone,function() {
				cb(true)
			})
		}
	}else{
		cb(false)
	}
}







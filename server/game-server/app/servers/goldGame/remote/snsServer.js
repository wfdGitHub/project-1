const SMSClient = require('@alicloud/sms-sdk')
const accessKeyId = 'LTAI3fa66E4b1lDb'
const secretAccessKey = 'VJGPJLNScbhvFbEJV228NeDYPGb7y2'

module.exports = function(app) {
	return new Remote(app);
};

var Remote = function(app) {
	this.app = app;
	Remote.GameService = this.app.get("GameService")
	Remote.smsClient = new SMSClient({accessKeyId, secretAccessKey})
};
var remote = Remote.prototype


//请求发送验证码
remote.sendCaptcha = function(result,cb) {
	//发送短信
	Remote.smsClient.sendSMS({
	    PhoneNumbers: 18850527356,
	    SignName: '大番薯',
	    TemplateCode: 'SMS_105525028',
	    TemplateParam: JSON.stringify({"name" : "欢乐赢棋牌" , "result" : result,"product" : "大番薯"})
	}).then(function (res) {
	    let {Code}=res
	    if (Code === 'OK') {
	        cb(true)
	    }
	}, function (err) {
	    console.log(err)
	    cb(false)
	})
}




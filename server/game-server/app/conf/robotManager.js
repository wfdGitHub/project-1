var http = require('http')
var manager = module.exports

manager.getRobotInfo = function(cb,type) {
	var data = {}
	data.diamond = 0
	data.uid = Math.floor(Math.random() * 100)
	data.nickname = "robot."+data.uid
	var qqId = Math.floor(Math.random() * 1000) + 752387000
	data.head = "http://q2.qlogo.cn/headimg_dl?bs="+qqId+"&dst_uin="+qqId+"&dst_uin="+qqId+"&;dst_uin="+qqId+"&spec=100&url_enc=0&referer=bu_interface"
	data.history = []
	data.sex = Math.random() > 0.5 ? 1 : 2
	data.limits = 0
	data.freeze = 0
	data.useDiamond = 0
	data.gold = Math.floor(Math.random() * 7000) + 2000
	data.isRobot = true
	data.charm = 0
	var refreshList = {}
	refreshList.lottoTime = 0 					//抽奖
	refreshList.lottoCount = 0 				
	refreshList.bankruptTime = 0				//破产保护
	refreshList.bankruptTimeCount = 0			
	refreshList.dayGoldTime = 0					//每日金币输赢
	refreshList.dayGoldValue = 0
	refreshList.charmTime = 0 					//今日魅力值
	refreshList.charmValue = 0	
	data.refreshList = refreshList
	
	//获取名字
    // var string = "http://users.qzone.qq.com/fcg-bin/cgi_get_portrait.fcg?uins="+qqId
    // var req=http.get(string,function(res){
    //     var tmpData = tmpData
    //     res.on("data",function(chunk) {
    //       tmpData += chunk
    //     })
    //     res.on("end",function() {
    //     	data.nickname = tmpData.split(",")[6].split("\"")[1]
    //     	console.log("nickname : "+data.nickname)
    //     	cb(data,type)
    //     })
    // })
    // req.on('error', function(e) {
    //   console.error(e);   
    // })
    cb(data,type)
}

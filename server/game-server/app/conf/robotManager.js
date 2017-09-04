var http = require('http')
var manager = module.exports

var robotState = {}
var ROBOT_AMOUNT = 1000
for(var i = 20000;i < 20000+ROBOT_AMOUNT;i++){
	robotState[i] = true
}

var goldList = {
	"1" : {"min" : 1000,"max" : 10000},
	"2" : {"min" : 5000,"max" : 50000},
	"3" : {"min" : 10000,"max" : 100000}
}
manager.getRobotInfo = function(type,uid,cb) {
	var data = {}
	data.diamond = 0
	data.uid = uid
	data.nickname = "robot."+uid
	var qqId = Math.floor(Math.random() * 1000) + 752387000
	data.head = "http://q2.qlogo.cn/headimg_dl?bs="+qqId+"&dst_uin="+qqId+"&dst_uin="+qqId+"&;dst_uin="+qqId+"&spec=100&url_enc=0&referer=bu_interface"
	data.history = []
	data.sex = Math.random() > 0.5 ? 1 : 2
	data.limits = 0
	data.freeze = 0
	data.useDiamond = 0
	var goldConf = goldList[type.split("-")[1]]
	if(goldConf){
		data.gold = Math.floor(Math.random() * (goldConf.max - goldConf.min)) + goldConf.min
	}else{
		data.gold = Math.floor(Math.random() * 7000) + 2000
	}
	data.diamond = data.gold
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
    robotState[uid] = false
    cb(data,type)
}

manager.getUnusedRobot = function() {
	//随机分配房间号
	var robotId = Math.floor((Math.random() * ROBOT_AMOUNT)) + 20000
	for(var i = robotId;i < ROBOT_AMOUNT + robotId;i++){
		var index = (robotId % ROBOT_AMOUNT) + 20000
		if(robotState[index] == true){
			return index
		}
	}
	return false
}

manager.freeRobot = function(uid) {
	robotState[uid] = true
}
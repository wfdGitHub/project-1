var manager = module.exports

manager.getRobotInfo = function() {
	var data = {}
	data.diamond = 0
	data.uid = Math.floor(Math.random() * 100)
	data.nickname = "robot."+data.uid
	var qqId = Math.floor(Math.random() * 200000000) + 500000000
	data.head = "http://qlogo4.store.qq.com/qzone/"+qqId+"/"+qqId+"/100"
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
	return data
}
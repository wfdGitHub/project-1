var manager = module.exports

manager.getRobotInfo = function() {
	var data = {}
	data.diamond = 0
	data.uid = Math.floor(Math.random() * 100)
	data.nickname = "小兰号机器人"+data.uid
	data.head = ""
	data.history = []
	data.sex = Math.random() > 0.5 ? 1 : 2
	data.limits = 0
	data.freeze = 0
	data.useDiamond = 0
	data.gold = Math.floor(Math.random() * 7000) + 2000
	data.isRobot = true
	return data
}
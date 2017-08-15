var manager = module.exports

manager.getRobotInfo = function() {
	var data = {}
	data.diamond = 0
	data.uid = Math.floor(Math.random() * 12000) + 10000
	data.nickname = "robot-no."+data.uid
	data.head = ""
	data.history = []
	data.sex = Math.random() > 0.5 ? 1 : 2
	data.limits = 0
	data.freeze = 0
	data.useDiamond = 0
	data.gold = Math.floor(Math.random() * 100) + 20
	data.isRobot = true
	return data
}
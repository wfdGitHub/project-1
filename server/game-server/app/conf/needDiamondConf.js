var MODE_DIAMOND_HOST = 1              //房主扣钻
var MODE_DIAMOND_EVERY = 2             //每人扣钻
var MODE_DIAMOND_WIN = 3               //大赢家扣钻

var needDiamondConf = {
	"zhajinhua" : {
		"6" : {
			"1" : 5,
			"2" : 1,
			"3" : 5,
			"agency" : 5
		},
		"9" : {
			"1" : 10,
			"2" : 2,
			"3" : 10,
			"agency" : 10
		},
		"12" : {
			"1" : 15,
			"2" : 2,
			"3" : 15,
			"agency" : 15
		}
	},
	"niuniu" : {
		"6" : {
			"1" : 3,
			"2" : 1,
			"3" : 3,
			"agency" : 3
		},
		"9" : {
			"1" : 6,
			"2" : 2,
			"3" : 6,
			"agency" : 6
		},
		"12" : {
			"1" : 9,
			"2" : 2,
			"3" : 9,
			"agency" : 9
		}
	}
}

var handler = module.exports

handler.getNeedDiamond = function(type,playerNumber,consumeMode,gameNumber) {
	if(type == "zhajinhua"){
		var tmpDiamond = needDiamondConf["zhajinhua"][playerNumber][consumeMode]
		if(gameNumber === 20){
			tmpDiamond *= 2
		}
		return tmpDiamond
	}else{
		var tmpDiamond = needDiamondConf["niuniu"][playerNumber][consumeMode]
		if(gameNumber === 20){
			tmpDiamond *= 2
		}
		return tmpDiamond
	}
}
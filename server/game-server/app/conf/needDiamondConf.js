var MODE_DIAMOND_HOST = 1              //房主扣钻
var MODE_DIAMOND_EVERY = 2             //每人扣钻
var MODE_DIAMOND_WIN = 3               //大赢家扣钻

var needDiamondConf = {
	"zhajinhua" : {
		"6" : {
			"10" : {
				"agency" : 2
			},
			"20" : {
				"agency" : 4
			}
		},
		"9" : {
			"12" : {
				"agency" : 3
			},
			"24" : {
				"agency" : 6
			}
		}
	},
	"niuniu" : {
		"6" : {
			"10" : {
				"agency" : 2
			},
			"20" : {
				"agency" : 4
			}
		},
		"9" : {
			"12" : {
				"agency" : 3
			},
			"24" : {
				"agency" : 6
			}
		}
	}
}

var handler = module.exports

handler.getNeedDiamond = function(type,playerNumber,consumeMode,gameNumber) {
	var tmpDiamond = false
	if(type == "zhajinhua"){
		if(needDiamondConf["zhajinhua"] && needDiamondConf["zhajinhua"][playerNumber]
		&& needDiamondConf["zhajinhua"][playerNumber][gameNumber] && needDiamondConf["zhajinhua"][playerNumber][gameNumber][consumeMode]){
			tmpDiamond = needDiamondConf["zhajinhua"][playerNumber][gameNumber][consumeMode]
		}
		return tmpDiamond
	}else{
		if(needDiamondConf["niuniu"] && needDiamondConf["niuniu"][playerNumber]
		&& needDiamondConf["niuniu"][playerNumber][gameNumber] && needDiamondConf["niuniu"][playerNumber][gameNumber][consumeMode]){
			tmpDiamond = needDiamondConf["niuniu"][playerNumber][gameNumber][consumeMode]
		}
		return tmpDiamond
	}
}
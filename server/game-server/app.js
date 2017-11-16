var pomelo = require('pomelo');
var GameService = require("./app/services/GameService.js")
var dbService = require("./app/services/dbService.js")
/**
 * Init app for client.
 */
var app = pomelo.createApp();
// app configuration
app.configure('production|development', 'connector', function(){
  app.set('connectorConfig',
    {
      connector : pomelo.connectors.hybridconnector,
      heartbeat : 10,
      disconnectOnTimeout: true,
      useDict : true,
      useProtobuf : true
    });
});
app.configure('production|development', 'gate', function(){
  app.set('connectorConfig',
    {
      connector : pomelo.connectors.hybridconnector,
      heartbeat : 10,
      disconnectOnTimeout: true,
      useDict : true,
      useProtobuf : true
    });
});
//加载GameService
app.configure('production|development', 'game', function() {
  app.load(GameService(app))
  app.load(dbService(app))
});
//加载dbService
app.configure('production|development', 'db', function() {
  app.load(dbService(app))
});
app.configure('production|development', 'gameNode', function() {
  app.load(dbService(app))
});
//游戏服务器分配路由
var gameNodeRoute = function(session, msg, app, cb) {
  var gameNodeServers = app.getServersByType('gameNode')

  if(!gameNodeServers || gameNodeServers.length === 0) {
    cb(new Error('can not find gameNode servers.'))
    return
  }
  //获取用户游戏服务ID
  var gid = msg.args[0].gid
  if(gid === undefined || !gameNodeServers[gid]){
    cb(new Error('can not find gameNode servers.'))
    return
  }
  cb(null, gameNodeServers[gid].id);
};
//连接服务器分配路由
var connectorRoute = function(session, msg, app, cb) {
  var connectors = app.getServersByType('connector')
  if(!connectors || connectors.length === 0) {
    cb(new Error('can not find connector servers.'))
    return
  }
  //获取用户游戏服务ID
  var cid = msg.args[0].cid
  if(cid === undefined){
    cb(new Error('can not find connector servers.'))
    return
  }
  cb(null, cid);
};
app.configure('production|development', function() {
  app.route('gameNode', gameNodeRoute);
  app.route('connector', connectorRoute);
});
// start app
app.start();

process.on('uncaughtException', function (err) {
  console.error(' Caught exception: ' + err.stack);
});

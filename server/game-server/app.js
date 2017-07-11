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
});
//加载dbService
app.configure('production|development', 'db', function() {
  app.load(dbService(app))
});
// start app
app.start();

process.on('uncaughtException', function (err) {
  console.error(' Caught exception: ' + err.stack);
});

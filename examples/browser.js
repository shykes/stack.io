
var stackio = require('../'),
    express = require('express');

stackio.debug = true;
var io = stackio();
var app = express.createServer();

app.get('/', function(req, res){
    res.sendfile(__dirname + '/browser.html');
});

app.listen(3000);

// RPC: exposing an object
io.expose('Test', {
    hello: function (arg, reply) {
        reply('Hello ' + arg);
    }
});

io.browser(app);


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
        var i = 0;
        //while (i < 42)
          //  reply(i++, true);
            //reply('Hello ' + arg + ' #' + i++, 1, 2, 3, 4);
        // Closing the response channel at the end of the stream
        reply('PIPO');
    }
});
/*
setInterval(function () {
    io.call('MyService', 'hello')(function (response) {
        console.log('MyService.hello -> ' + response);
    });
}, 1000);
*/
io.browser(app);

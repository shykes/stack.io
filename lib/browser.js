
var express = require('express');
var socketio = require('socket.io');

module.exports.serve = function (stackio, app) {
    var port;
    if (typeof app !== 'object') {
        port = app;
        app = express.createServer();
    }
    socketio = socketio.listen(app);
    app.get('/stack.io/stack.io.js', function (req, res) {
        res.sendfile(__dirname + '/browser_client.js');
    });
    if (port !== undefined)
        app.listen(port);
    bindMessages(stackio, socketio);
};

function bindMessages(stackio, socketio) {
    socketio.sockets.on('connection', function (socket) {
        socket.on('stackio_event_emit', function (message) {
            stackio.emit(message.channel, message.data);
        });
        socket.on('stackio_event_on', function (message) {
            stackio.on(message.channel, function (data) {
                socket.emit(message.channel, data);
            });
        });
        socket.on('stackio_rpc_call', function (message) {
            var args = message.args;
            args.push(function (response) {
                socket.emit(message.responseChannel, response);
            });
            stackio.call(message.service, message.method).apply(this, args);
        });
        socket.on('stackio_rpc_expose', function (message) {
            var obj = {};
            for (i in message.args) {
                obj[message.args[i]] = function () {
                    //TODO
                };
            }
            stackio.expose(message.service, obj);
        });
    });
}

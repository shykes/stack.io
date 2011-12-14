/**
 * Distributed Message Queue library implementing the EventEmitter API
 * Copyright 2011 DotCloud Inc (Samuel Alba <sam@dotcloud.com>))
 *
 * This project is free software released under the MIT license:
 * http://www.opensource.org/licenses/mit-license.php
 */

var stackio = (function () {
    var _socket;

    function constructor() {
        _socket = io.connect(window.location.origin);
        return this;
    };

    var _createMessage = function (channel, data) {
        return {
            data: data,
            version: 1,
            channel: channel
        };
    };

    this.emit = function (channel, data) {
        var message = _createMessage(channel, data);
        _socket.emit('stackio_event_emit', message);
    };

    this.on = function (channel, callback) {
        var message = _createMessage(channel);
        _socket.on(channel, function (data) {
            callback(data);
        });
        _socket.emit('stackio_event_on', message);
    };

    this.call = function (service, method) {
        return function () {
            var responseCallback = arguments[arguments.length - 1];
            if ((typeof responseCallback) == 'function')
                delete arguments[arguments.length - 1];
            else
                responseCallback = null;
            var args = [];
            // converting arguments object to an array
            for (var i in arguments)
                args.push(arguments[i]);
            var message = {
                responseChannel: 'stackio_browser_response_' + Math.floor(Math.random() * 1000001),
                args: args,
                service: service,
                method: method
            };
            if (responseCallback) {
                _socket.on(message.responseChannel, function (data) {
                    responseCallback(data);
                });
                console.log('Listen on ' + message.responseChannel);
            }
            _socket.emit('stackio_rpc_call', message);
        };
    };

    return constructor;
})();

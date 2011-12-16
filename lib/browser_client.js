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

    this.emit = function (channel, data) {
        var message = {
            channel: channel,
            data: data
        };
        _socket.emit('stackio_event_emit', message);
    };

    this.on = function (channel, callback) {
        var message = {
            channel: channel
        };
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
                var replied = false;
                _socket.on(message.responseChannel, function (m) {
                    replied = true;
                    if (m.data !== undefined)
                        responseCallback(m.data);
                    if (m.close === true)
                        _socket.removeAllListeners(message.responseChannel);
                });
                setTimeout(function () {
                    if (replied === true)
                        return;
                    _socket.removeAllListeners(message.responseChannel);
                }, 30 * 1000);
            }
            _socket.emit('stackio_rpc_call', message);
        };
    };

    this.expose = function (service, obj) {
        var message = {
            service: service,
            args: Object.keys(obj)
        };
        _socket.on('stackio_rpc_expose_' + service, function (m) {
            m.args.push(function (data, keepOpen) {
                var n = {
                    close: !keepOpen,
                    data: data
                };
                _socket.emit(m.responseChannel, n);
            });
            obj[m.method].apply(this, m.args);
        });
        _socket.emit('stackio_rpc_expose', message);
    };

    return constructor;
})();

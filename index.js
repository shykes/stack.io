/**
 * Distributed Message Queue library implementing the EventEmitter API
 * Copyright 2011 DotCloud Inc (Samuel Alba <sam@dotcloud.com>))
 *
 * This project is free software released under the MIT license:
 * http://www.opensource.org/licenses/mit-license.php
 */

var url = require('url');

module.exports = stackio;
module.exports.debug = false;
module.exports.error = function (err) {
    error(err);
};


/**
 *  Top-level object
 */

function stackio(options) {
    if (!(this instanceof stackio))
        return new stackio(options);
    this._options = options || {};
    var type = this._options.type || 'pub/sub';
    var transport_url = this._options.transport || 'redis';
    var idx = transport_url.indexOf(':');
    this._options.transport = (idx === -1) ? transport_url : transport_url.slice(0, idx);
    this._options.transport_url = url.parse(transport_url);
    var transport = require('./lib/transport_' + this._options.transport);
    // Selecting the right object based on the settings
    var base = new ({
        'push/pull': transport.pushPull,
        'pub/sub': transport.pubSub
    }[type])(this._options);
    // Use pushPull transport type explicitely for RPC response
    this._replyTransport = new transport.pushPull(this._options);
    // Kind-of dynamic inheritance from the base class
    for (var key in base)
        this[key] = base[key];
}


/**
 * High level methods for RPC
 */

stackio.prototype.expose = function (service, obj) {
    var self = this;
    this.on('rpc_' + service, function (data) {
        var method = obj[data.method];
        if ((typeof method) != 'function')
            return;
        data.args.push(function (response, keepOpen) {
            var m = {
                close: !keepOpen,
                data: response
            };
            self._replyTransport.emit(data.responseChannel, m, keepOpen);
        });
        method.apply(this, data.args);
    });
};

stackio.prototype.call = function (service, method) {
    var self = this;
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
        var data = {
            method: method,
            args: args,
            responseChannel: 'response_' + Math.floor(Math.random() * 1000001)
        };
        if (responseCallback) {
            // In case the callback never used the response channel, we set a
            // timeout to destroy it after 30 seconds
            var replied = false;
            self._replyTransport.on(data.responseChannel, function (m) {
                replied = true;
                responseCallback(m.data, !m.close);
                if (m.close === true)
                    self._replyTransport.removeAllListeners(data.responseChannel);
            });
            setTimeout(function () {
                if (replied === true)
                    return;
                g_debug('Cleaning responseChannel');
                self._replyTransport.removeAllListeners(data.responseChannel);
            }, 30 * 1000);
        }
        self.emit('rpc_' + service, data);
    }
};


/**
 * Browser support
 */

stackio.prototype.browser = function (app) {
    // App is a webserver or a port number
    var browser = require('./lib/browser');
    browser.serve(this, app);
}


/**
 * Helpers
 */

g_createMessage = function (data) {
    return {
        data: data,
        version: 1
    };
}

g_debug = function (data) {
    if (module.exports.debug !== true)
        return;
    console.log('# DEBUG::' + Date.now() + ':: ' + data);
}

g_error = function (data) {
    console.log('# ERROR::' + Date.now() + ':: ' + data);
}

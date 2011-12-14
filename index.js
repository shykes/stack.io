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
    // Kind-of dynamic inheritance from the base class
    for (var key in base)
        this[key] = base[key];
}


/**
 * High level methods for RPC
 */

stackio.prototype.expose = function (service, obj) {
    var parent = this;
    this.on('rpc_' + service, function (data) {
        var method = obj[data.method];
        if ((typeof method) != 'function')
            return;
        data.args.push(function (response, keepOpen) {
            parent.emit(data.responseChannel, response, !keepOpen);
        });
        method.apply(this, data.args);
    });
};

stackio.prototype.call = function (service, method) {
    var parent = this;
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
            responseChannel: 'response_' + randomId(32)
        };
        if (responseCallback) {
            // In case the callback never used the response channel, we set a
            // timeout to destroy it after 30 seconds
            var replied = false;
            setTimeout(function () {
                if (replied === true)
                    return;
                g_debug('Cleaning responseChannel');
                parent.removeAllListeners(data.responseChannel);
            }, 30 * 1000);
            parent.on(data.responseChannel, function (data) {
                replied = true;
                responseCallback(data);
            });
        }
        parent.emit('rpc_' + service, data);
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

g_createMessage = function (data, close) {
    return {
        data: data,
        version: 1,
        close: (close === true)
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

function randomId(length) {
    var callbacks = [
        function() {
            //48 - 57 ('0' - '9')
            return ((Math.round(Math.random() * 101)) % 10) + 48;
        },
        function() {
            //65 - 90 ('A' - 'Z')
            return ((Math.round(Math.random() * 101)) % 26) + 65;
        },
        function() {
            //97 - 122 ('a' - 'z')
            return ((Math.round(Math.random() * 1001)) % 26) + 97;
        }
    ];
    var result = '';
    for (var i = 0; i < length; i++) {
        var choice = Math.round(((Math.random() * 11) % (callbacks.length - 1)));
        result += String.fromCharCode(callbacks[choice]());
    }
    return result;
}

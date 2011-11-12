/**
 * Distributed Message Queue library implementing the EventEmitter API
 * Copyright 2011 DotCloud (Samuel Alba <sam@dotcloud.com>)
 *
 * This project is free software released under the MIT license:
 * http://www.opensource.org/licenses/mit-license.php
 */

var redis = require('redis');

var count = 0;
var createClient = function () {
    var id = count++;
    var client = redis.createClient(
            process.env.DOTCLOUD_REDIS_REDIS_PORT,
            process.env.DOTCLOUD_REDIS_REDIS_HOST
            );
    client.auth(process.env.DOTCLOUD_REDIS_REDIS_PASSWORD);
    client.id = id;
    debug('Created client #' + id);
    client.on('end', function () {
        debug('Client disconnected #' + id);
    });
    client.on('error', function (err) {
        module.exports.error(err);
    });
    return client;
};

var global_client = createClient();

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
    // Selecting the right object based on the settings
    var base = new ({
        'push/pull': pushPull,
        'pub/sub': pubSub
    }[type])(options);
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
        method.apply(null, data.args);
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
                debug('Cleaning responseChannel');
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
 * PUB/SUB object
 */

function pubSub(options) {
    this._options = options;
    this._prefix = 'stackio_pubsub_';
    this._response = new pushPull;
    this._listeners = {};
    return this;
}

pubSub.prototype.on = function (channel, callback) {
    channel = this._prefix + channel;
    var client = createClient();
    if (this._listeners[channel] === undefined)
        this._listeners[channel] = [];
    this._listeners[channel].push(client);
    if (client.closing === false)
        client.subscribe(channel);
    debug('#' + client.id + ' SUBSCRIBE ' + channel);
    client.on('message', function (chan, message) {
        message = JSON.parse(message);
        if (message.data !== null)
            callback(message.data);
        if (message.close === true)
            client.end();
    });
};

pubSub.prototype.addListener = pubSub.prototype.on;

pubSub.prototype.emit = function (channel, data, close) {
    var message = createMessage(data, close);
    channel = this._prefix + channel;
    global_client.publish(channel, JSON.stringify(message));
    debug('#' + global_client.id + ' PUBLISH ' + channel);
};

pubSub.prototype.removeAllListeners = function (channel) {
    channel = this._prefix + channel;
    var list = this._listeners[channel];
    if (list === undefined)
        return;
    for (i in list)
        list[i].end();
    delete this._listeners[channel];
};


/**
 * PUSH/PULL object
 */

function pushPull(options) {
    this._options = options;
    this._emitCounters = {};
    this._prefix = 'stackio_pushpull_';
    this._listeners = {};
    return this;
}

pushPull.prototype.on = function (channel, callback) {
    channel = this._prefix + channel;
    var client = createClient();
    if (this._listeners[channel] === undefined)
        this._listeners[channel] = [];
    this._listeners[channel].push(client);
    var parent = this;
    var popCallback = function (err, data) {
        message = JSON.parse(data[1]);
        if (message.data !== null)
            callback(message.data);
        if (message.close === true)
            client.close();
        if (client.closing === false)
            client.blpop(channel, 0, popCallback);
        debug('#' + client.id + ' BLPOP ' + channel);
    }
    if (client.closing === false)
        client.blpop(channel, 0, popCallback);
    debug('#' + client.id + ' BLPOP ' + channel);
};

pushPull.prototype.addListener = pushPull.prototype.on;

pushPull.prototype.emit = function (channel, data) {
    var rpush = function (data) {
    }
    channel = this._prefix + channel;
    if (this._emitCounters[channel] === undefined)
        this._emitCounters[channel] = 0;
    // Checking the size of the queue every 10 messages
    if (this._emitCounters[channel] > 10) {
        var parent = this;
        var client = createClient();
        client.llen(channel, function (err, len) {
            // If the length of the queue reaches 100 messages, ignoring
            // further pushes
            if (len > 100)
                debug('Warning: message queue is full, cannot push');
            else
                parent._emitCounter = 0;
            client.end();
        });
        return;
    }
    var message = createMessage(data);
    global_client.rpush(channel, JSON.stringify(message));
    debug('#' + global_client.id + ' RPUSH ' + channel);
};

pushPull.prototype.removeAllListeners = function (channel) {
    channel = this._prefix + channel;
    var list = this._listeners[channel];
    if (list === undefined)
        return;
    for (i in list)
        list[i].end();
    // In case of push/pull, we can have a list that left
    global_client.del(this._prefix + channel);
    delete this._listeners[channel];
};


/**
 * Helpers
 */

function createMessage(data, close) {
    return {
        data: data,
        version: 1,
        close: (close === true)
    };
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

function debug(data) {
    if (module.exports.debug !== true)
        return;
    console.log('# DEBUG::' + Date.now() + ':: ' + data);
}

function error(data) {
    console.log('# ERROR::' + Date.now() + ':: ' + data);
}

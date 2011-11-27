var stackio = require('../');
var test = require('tap').test;

test('rpc_pubSub', function (t) {
    var io = stackio({type: 'pub/sub'});
    io.expose('Test', {
        hello: function (reply) {
            reply(42);
        }
    });
    io.call('Test', 'hello')(function (response) {
        t.equal(response, 42, 'Test.hello() = 42');
        t.end();
    });
});

test('rpc', function (t) {
    var io = stackio({type: 'push/pull'});
    io.expose('Test', {
        hello: function (reply) {
            reply(42);
        }
    });
    io.call('Test', 'hello')(function (response) {
        t.equal(response, 42, 'Test.hello() = 42');
        t.end();
    });
});

setTimeout(function () {
    process.exit();
}, 1000);

var stackio = require('../');
var test = require('tap').test;

test('rpc', function (t) {
    var io = stackio();
    io.expose('Test', {
        test: function (reply) {
            reply(42);
        }
    });
    io.call('Test', 'hello')(function (response) {
        t.equal(42, 'Test.hello() = 42');
        t.end();
    });
});

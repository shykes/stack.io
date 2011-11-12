var stackio = require('../');
var test = require('tap').test;

test('events', function (t) {
    var io = stackio();
    io.on('test_event', function (data) {
        t.equal(data, 42, 'got 42');
        t.end();
    });
    io.emit('test_event', 42);
});

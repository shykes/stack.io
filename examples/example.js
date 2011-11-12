
require.paths.push(__dirname + '/lib');
var stackio = require('stackio');
stackio.debug = true;
var io = stackio();

io.call('Test', 'hello')('pipo', function (response) {
    console.log('Got: ' + response);
});

io.expose('Test', {
    hello: function (arg, reply) {
        reply('Hello ' + arg);
    }
});

// Basic event messaging
io.on('event_name', function (data) {
    console.log('2: Got an event_name "' + JSON.stringify(data) + '"; type: ' + (typeof data));
});

setInterval(function () {
    io.emit('event_name', 'PIPO');
    console.log('Event emitted');
}, 1000);

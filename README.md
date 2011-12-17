# Stack.io library #

Stack.io is a distributed Event Emitter library to communicate easily between
different nodejs app (or services).

It implements the EventEmitter API to be used in an intuitive way.

It implements also an RPC (Remote Procedure Call) layer on top of the Events
layer to expose JavaScript objects easily through the network.

Only Push/Pull and Pub/Sub models are implemented on top of Redis but the
library has been implemented to be transport agnostic. So other transports will
follow.

Features:
 * EventEmitter-like implementation
 * RPC, expose and call a Service from anywhere
 * Transport agnostic (multi-transport will follow)
 * Any Object or Events can ben called or exposed from the browser (using socket.io)

Feel free to checkout
[the examples](https://github.com/dotcloud/stack.io/blob/master/examples/example.js)
and also the browser support examples
([backend](https://github.com/dotcloud/stack.io/blob/master/examples/browser.js) and
 [frontend](https://github.com/dotcloud/stack.io/blob/master/examples/browser.html)).

Let's start:

    $ npm install stack.io
    $ node
    > var stackio = require('stack.io'),
    >     io = stackio();

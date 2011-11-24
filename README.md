# Stack.io library #

Stack.io is a distributed Event Emitter library to communicate easily between
different nodejs app (or services).

It implements the EventEmitter API to be used in an intuitive way.

It implements also an RPC (Remote Procedure Call) layer on top of the Events
layer to expose JavaScript objects easily through the network.

Only Push/Pull and Pub/Sub models are implemented on top of Redis but the
library has been implemented to be transport agnostic. So other transports will
follow.

Feel free to checkout the examples in examples/example.js

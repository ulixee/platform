# Configuration

### Address Host

A Server addressHost can be specified on creation. This would all you to create a custom domain for your connections, or to provide an externally addressable ip to reach your Servers.

### Server ListenInfo

A Server can provide ListenInfo on [`listen(listenInfo)`](/docs/server/basic-interfaces/server). The data follows the Node.js [net.ListenInfo](https://nodejs.org/api/net.html#serverlistenoptions-callback) spec.

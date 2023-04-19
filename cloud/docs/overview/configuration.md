# Configuration

### Address Host

A CloudNode addressHost can be specified on creation. This would allow you to create a custom domain for your connections, or to provide an externally addressable ip to reach your Servers.

### CloudNode Server ListenInfo

A CloudNode can be provided ListenInfo on [`listen(listenInfo)`](../modules/cloud-node.md). The data follows the Node.js [net.ListenInfo](https://nodejs.org/api/net.html#serverlistenoptions-callback) spec.

### Disable ChromeAlive!

ChromeAlive! will be automatically enabled for Hero and DatastoreForHero sessions if `@ulixee/desktop-core` is installed locally.

To disable launching ChromeAlive!, you can include `process.env.ULX_DISABLE_CHROMEALIVE='true'` at the top of your script, or set the corresponding variable in your shell environment.

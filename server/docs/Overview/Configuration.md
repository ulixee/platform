# Configuration

### Address Host

A Server addressHost can be specified on creation. This would all you to create a custom domain for your connections, or to provide an externally addressable ip to reach your Servers.

### Server ListenInfo

A Server can provide ListenInfo on [`listen(listenInfo)`](/docs/server/basic-interfaces/server). The data follows the Node.js [net.ListenInfo](https://nodejs.org/api/net.html#serverlistenoptions-callback) spec.

### Disable ChromeAlive!

ChromeAlive! will be automatically enabled for Hero and DataboxForHero sessions if `@ulixee/apps-chromealive-core` is installed locally.

To disable launching ChromeAlive!, you can include `process.env.DISABLE_CHROMEALIVE='true'` at the top of your script, or set the corresponding variable in your shell environment.

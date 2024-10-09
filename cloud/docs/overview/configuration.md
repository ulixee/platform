# Configuration

Environmental configurations are available in the default [`.env.defaults file`](https://github.com/ulixee/platform/tree/main/cloud/main/.env.defaults). You can specify your own .env file using this template and pointing to this file in the cli using `npx @ulixee/cloud start --env ./.env`.

### Cloud Host

A CloudNode host can be specified on creation. This would allow you to create a custom domain for your connections, or to provide an externally addressable ip to reach your Servers.

### Cloud Port

A CloudNode will listen on port 1818 by default, but can be overridden on creation.

### Disable Desktop APIs

By default, Ulixee Cloud will activate apis to explore Hero Sessions and replay them in Ulixee Desktop. If you don't want to activate this feature, you can disable using this environment variable (also part of the cli `--disable-desktop-apis`).

**Environment:** `ULX_DISABLE_DESKTOP_APIS=true`

### Hosted Services

You can configure what IP/port to listen for Hosted Services using the `hostedServicesServerOptions` on the [CloudNode constructor](../modules/cloud-node.md#constructor). You should make this IP private to your cluster to avoid exposing internals to nodes outside your cluster.

Other nodes in your cluster can use these services by simply specifying this hosted services server host (`setupHost: localhost: 18181`)

### Configure Hero Core

You can configure Hero with any desired options using the `heroCoreConfiguration` property on the [CloudNode constructor](../modules/cloud-node.md#constructor).

### Configure Datastore Core

You can configure Datastore Core with any desired options using the `datastoreCoreConfiguration` property on the [CloudNode constructor](../modules/cloud-node.md#constructor).

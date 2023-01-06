# Plugins

Datastore Functions can easily be extended to include custom functionality. Examples of plugins are included in this repository for [Puppeteer](./puppeteer-plugin.md) and [Hero](./hero-plugin.md).

```js
import { HeroFunctionPlugin, Function } from '@ulixee/datastore-plugins-hero';

export default new Function(
  {
    run(ctx) {
      // add functionality
      const { Hero } = ctx;
    },
  },
  HeroFunctionPlugin,
);
```

## Creating a Plugin

To create a plugin, you simply need to create a class implementing the run callback. You can use it by passing it to the [Function constructor](../basics/function#constructor) `plugins` argument.

## Properties

### name `string`

The name of the plugin.

### version `string`

A semver version of this plugin.

## Callback Method

The following method is called during Datastore Function setup:

### run _(functionInternal, lifecycle, next)_

Called when a Datastore Function instance starts execution. This function gives you access to the Function lifecycle.

A plugin can enhance the [FunctionContext](../basics/function-context.md) pass to a Function's `run` callback. For instance, the [Hero plugin](./hero-plugin.md) adds a [Hero](https://ulixee.org/docs/hero/basic-client/hero) and a [HeroReplay](https://ulixee.org/docs/hero/basic-client/hero-replay) constructor that automatically connect to the local Core.

A plugin _MUST_ call the `next()` callback provided. This callback will allow all other plugins to run to their `next()` callbacks. At that point, the Function will execute all phases. The output will then be returned to the waiting `next()` promise. At that point, each plugin will be allowed to complete the rest of its `run()` callback before the Datastore Function will be closed. The flow is shown below:

```js
// 1. for each plugin, call run
for (const plugin of plugins) {
  plugin.run(functionInternal, context, next);
}

// 2. wait for every plugin "next" to be called
await waitForAllNextsCalled();

// 3. run Function `run`
func.run();

// 4. resolve nexts
resolveNexts(functionInternal.output);

// 5. allow plugins to cleanup/complete
await waitForPluginRunsComplete();
```

A plugin lifecycle will look like this:

```js
class Plugin {
  name = pkg.name;
  version = pkg.version;

  async run(functionInternal, context, next) {
    try {
      context.Hero = createBoundHeroConstructor();
      //  wait for next to complete
      const output = await next();
    } finally {
      // cleanup
      await this.hero?.close();
      await this.heroReplay?.close();
    }
  }
}
```

#### **Arguments**:

Arguments provided to the callback are as follows:

- `functionInternal`: An object providing the internal holder of the configuration of the Datastore instance.
- `context`: The Function Context object containing the state of the Function and Parameters.
- `next`: A callback that allows a plugin to wait for a Function to complete. It will resolve with the output of the Function.

#### Returns Promise<any>. The function may return any promise.

## Typescript Support

Your plugin can be configured so that a Typescript developer using your plugin will receive typing support for:

- Variables added onto the `run` callback.
- Additional configuration enabled in `Function.stream`.

If you implement the [FunctionPluginStatics](https://github.com/ulixee/platform/tree/main/datastore/client/interfaces/IFunctionPluginStatics.ts), this typing will be activated by simply adding your plugin to a new Function `new Function(..., YourPlugin)`. The typing for these functions is somewhat complex. It's recommended to copy an existing plugin (`https://github.com/ulixee/platform/tree/main/datastore/plugins`).

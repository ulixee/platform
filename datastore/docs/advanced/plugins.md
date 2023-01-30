# Plugins

Datastore Runners can easily be extended to include custom functionality. Examples of plugins are included in this repository for [Puppeteer](./puppeteer-plugin.md) and [Hero](./hero-plugin.md).

```js
import { HeroRunnerPlugin, Runner } from '@ulixee/datastore-plugins-hero';

export default new Runner(
  {
    run(ctx) {
      // add functionality
      const { Hero } = ctx;
    },
  },
  HeroRunnerPlugin,
);
```

## Creating a Plugin

To create a plugin, you simply need to create a class implementing the run callback. You can use it by passing it to the [Runner constructor](../basics/runner#constructor) `plugins` argument.

## Properties

### name `string`

The name of the plugin.

### version `string`

A semver version of this plugin.

## Callback Method

The following method is called during Datastore Runner setup:

### run _(runnerInternal, lifecycle, next)_

Called when a Datastore Runner instance starts execution. This function gives you access to the Runner lifecycle.

A plugin can enhance the [RunnerContext](../basics/runner-context.md) pass to a Runner's `run` callback. For instance, the [Hero plugin](./hero-plugin.md) adds a [Hero](https://ulixee.org/docs/hero/basic-client/hero) and a [HeroReplay](https://ulixee.org/docs/hero/basic-client/hero-replay) constructor that automatically connect to the local Core.

A plugin _MUST_ call the `next()` callback provided. This callback will allow all other plugins to run to their `next()` callbacks. At that point, the Runner will execute all phases. The output will then be returned to the waiting `next()` promise. At that point, each plugin will be allowed to complete the rest of its `run()` callback before the Datastore Runner will be closed. The flow is shown below:

```js
// 1. for each plugin, call run
for (const plugin of plugins) {
  plugin.run(runnerInternal, context, next);
}

// 2. wait for every plugin "next" to be called
await waitForAllNextsCalled();

// 3. run Runner `run`
runner.run();

// 4. resolve nexts
resolveNexts(runnerInternal.output);

// 5. allow plugins to cleanup/complete
await waitForPluginRunsComplete();
```

A plugin lifecycle will look like this:

```js
class Plugin {
  name = pkg.name;
  version = pkg.version;

  async run(runnerInternal, context, next) {
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

- `runnerInternal`: An object providing the internal holder of the configuration of the Datastore instance.
- `context`: The Runner Context object containing the state of the Runner and Parameters.
- `next`: A callback that allows a plugin to wait for a Runner to complete. It will resolve with the output of the Runner.

#### Returns Promise<any>. The function may return any promise.

## Typescript Support

Your plugin can be configured so that a Typescript developer using your plugin will receive typing support for:

- Variables added onto the `run` callback.
- Additional configuration enabled in `Runner.stream`.

If you implement the [RunnerPluginStatics](https://github.com/ulixee/platform/tree/main/datastore/client/interfaces/IRunnerPluginStatics.ts), this typing will be activated by simply adding your plugin to a new Runner `new Runner(..., YourPlugin)`. The typing for these runners is somewhat complex. It's recommended to copy an existing plugin (`https://github.com/ulixee/platform/tree/main/datastore/plugins`).

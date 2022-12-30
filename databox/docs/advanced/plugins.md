# Plugins

Databox Functions can easily be extended to include custom functionality. Examples of plugins are included in this repository for [Puppeteer](./puppeteer-plugin.md) and [Hero](./hero-plugin.md).

```js
import { HeroFunctionPlugin, Function } from '@ulixee/databox-plugins-hero';

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

The following method is called during Databox Function setup:

### run _(functionInternal, lifecycle, next)_

Called when a Databox Function instance starts execution. This function gives you access to the Function lifecycle.

A plugin can manipulate the lifecycle [FunctionContext](../basics/function-context.md) of each phase of a Function (`beforeRun`, `run` and `afterRun`). For instance, the [Hero plugin](./hero-plugin.md) initializes and adds a [Hero](https://ulixee.org/docs/hero/basic-client/hero) instance to the `run` context and a [HeroReplay](https://ulixee.org/docs/hero/basic-client/hero-replay) instance to the `afterRun` callback.

The lifecycle object passed in will indicate if a Function has defined a callback for each phase by marking the phase as `isEnabled`. Each plugin can choose to activate or deactivate a phase, so long as the Function has a callback to run.

A plugin _MUST_ call the `next()` callback provided. This callback will allow all other plugins to run to their `next()` callbacks. At that point, the Function will execute all phases. The output will then be returned to the waiting `next()` promise. At that point, each plugin will be allowed to complete the rest of its `run()` callback before the Databox Function will be closed. The flow is shown below:

```js
// 1. for each plugin, call run
for (const plugin of plugins) {
  plugin.run(functionInternal, lifecycle, next);
}

// 2. wait for every plugin "next" to be called
await waitForAllNextsCalled();

// 3. run Function phases
for (const phase of phases) {
  if (phase.isEnabled) await func[phase](phase.context);
}
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

  async run(functionInternal, lifecycle, next) {
    try {
      // modify lifecycle enablement
      lifecycle.run.isEnabled = this.isVariableSet();

      // initialize context variables as needed
      if (lifecycle.run.isEnabled) {
        lifecycle.run.context.runVar = await this.getRunVar();
      }

      if (lifecycle.afterRun.isEnabled) {
        lifecycle.afterRun.context.runVar = await this.getAfterRunVar();
      }
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

- `functionInternal`: An object providing the internal holder of the configuration of the Databox instance.
- `lifecycle`: An object to control the activation, and context variables of each Function phase (`run`, `beforeRun`, `afterRun`).
  - beforeRun
    - context `IBeforeContext`. The context that will be injected into the `beforeRun` callback.
    - isEnabled `boolean`. Did the Function include a `beforeRun` callback, and is it still enabled.
  - run
    - context `IContext`. The context that will be injected into the `run` callback.
    - isEnabled `boolean` Did the Function include a `run` callback, and is it still enabled.
  - afterRun
    - context `IAfterContext`. The context that will be injected into the `afterRun` callback.
    - isEnabled `boolean` Did the Function include a `afterRun` callback, and is it still enabled.
- `next`: A callback that allows a plugin to wait for a Function to complete. It will resolve with the output of the Function.

#### Returns Promise<any>. The function may return any promise.

## Typescript Support

Your plugin can be configured so that a Typescript developer using your plugin will receive typing support for:
- Additional configuration allowed in a Function constructor.
- Variables added onto the `run`, `beforeRun` and `afterRun` phases. 
- Additional configuration enabled in `Function.exec`.

If you implement the [FunctionPluginStatics](https://github.com/ulixee/platform/tree/main/databox/client/interfaces/IFunctionPluginStatics.ts), this typing will be activated by simply adding your plugin to a new Function `new Function(..., YourPlugin)`. The typing for these functions is somewhat complex. It's recommended to copy an existing plugin (`https://github.com/ulixee/platform/tree/main/databox/plugins`).

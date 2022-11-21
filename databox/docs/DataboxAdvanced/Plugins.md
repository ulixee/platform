# Plugins

Databoxes can easily be extended to include custom functionality. Examples of plugins are included in this repository for [Puppeteer](/docs/databox/databox-for-puppeteer) and [Hero](/docs/databox/databox-plugins-hero).

## Installing a Plugin

To install a plugin, you simply need to add a class implementing any of the following callbacks to the `DataboxExecutable` (`@ulixee/databox/lib/DataboxExectable`) `plugins` array. It's easiest to create a new class that extends DataboxExecutable and add the plugin Class to the `plugins` array in the constructor.

## Properties

### shouldRun `boolean`

Optional property to indicate if the Databox should perform the "run" phase of the Databox. This might not be run if, for instance, a DataboxForHero is only running the `onAfterHeroCompletes` phase.

### name `string`

The name of the plugin.

### version `string`

A semver version of this plugin.

## Callbacks

Each of the following plugins is called during the lifecycle of the Databox instance.

### onStart?(

    databoxInternal: DataboxInternal<TInput, TOutput>,
    options: IDataboxExecOptions,
    defaults: any,

): void | Promise<void>;

Called when a Databox instance starts execution. This is a good place to perform initialization logic.

#### **Arguments**:

Arguments provided to the callback are as follows:

- `databoxInternal`: An object providing the internal holder of the configuration of the Databox instance.
- `options`: Configuration used to run this Databox via command line, environment variables and defaults.
- `defaults`: Any default values provided to the callback.

### onBeforeRun?(databoxObject: DataboxObject<TInput, TOutput>): void | Promise<void>;

Called if the `run` phase of the Databox will execute (eg, `shouldRun` is true).

### onBeforeClose?(): void | Promise<void>;

Called before the Databox will be closed and torn down.

### onClose?(): void | Promise<void>;

Called after the Databox has been torn down.

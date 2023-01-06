# Configuration

Datastores are dynamically configurable via a command line, and each Datastore Function allows you to define default configurations if none are provided (schemas can define default inputs, Plugins can add default configurations (eg, HeroFunctionPlugin adds `defaultHeroOptions` to a Function constructor).

Command line variables are parsed using [yargs-parser](https://github.com/yargs/yargs-parser). Variables containing a '.' will be converted into objects, and dashes are camel-cased.

```shell
  node ./function.js --input.foo=99 --input.bar=9987930 --connectionToCore.host=ws://localhost:1228
```

Options will be read as:

```js
const options = {
  input: {
    foo: 99,
    bar: 9987930,
  },
  connectionToCore: {
    host: 'ws://localhost:1228',
  },
};
```

### Default Connection

If no connectionToCore is provided to a Datastore, a localhost Miner connection will attempt to be automatically discovered.

### Defer Running Datastore

Any script you run from the command line that default exports a Datastore instance is automatically run. You can disable autorun defer running by setting ULX_DATASTORE_DISABLE_AUTORUN to `true`.

- ULX_DATASTORE_DISABLE_AUTORUN `string`. Set this to `true` to explicitly disable autorunning Datastores when a script is directly executed from the command line.

### Datastore Core Storage {#storage}

Datastore Core stores and retrieves [packaged Datastores](./deployment) from a configurable location on a machine. This directory will contain:

1. `dbx*`. Packaged datastores organized into folders by their Bech32m encoded hashes.
2. `index.db`. A sqlite3 file containing an index of all Datastores installed locally. This index will be automatically updated if new files are added to the folder and requested in a query.

During bootup, any Packaged Datastore files (`.dbx`) in this directory will be automatically unpacked and loaded.

#### Environment Variable

- ULX_DATASTORE_DIR `string`. Absolute path to a directory containing Datastores. Defaults to `<CACHE>/ulixee/datastores`.

#### Cache Directory {#cache}

CACHE is determined as:

- Mac: ~/Library/Cache
- Linux: ~/.cache (environment variable XDG_CACHE_HOME)
- Windows: ~/AppData/Local (environment variable LOCALAPPDATA)

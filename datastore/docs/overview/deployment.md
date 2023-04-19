# Deployment

## Packaged Datastores (DBX directories)

Datastores are packaged into a single javascript file for deployment. They include a sourcemap and manifest file indicating how to run the Datastore functions. These files are aggregated and deployed in a `.dbx` folder adjacent to your script entrypoint.

We provide a packaging tool out of the box to combine your Datastore and included modules into a single file. It can be run using the Datastore CLI commands or the Ulixee CLI.

### <Script>.dbx folders

Your Datastore will be packaged into a folder with the same name and path as your script, but with the extension `.dbx`. These files are safe to check-in to source control so other developers on your team can package and deploy the datastores without a need to re-build them. You can also ftp them onto a Cloud Node to [deploy](#deploying) them.

A `.dbx` folder has the following files in it:

- `datastore.js` The single file containing all your javascript code and a default export containing a `Datastore` instance.
- `datastore.js.map` A source map for your javascript.
- `datastore-manifest.json` A manifest file with a valid hash code. See Manifest section.
- `docpage.json` A configuration for controlling the documentation website.
- `storage.db` A Sqlite3 db containing your bootstrapped records and table structures.

#### Out Directory

If you want to build all your `.dbx` folders so they can be deployed manually onto a Cloud (eg, if you have a Docker image and wish to pre-deploy `.dbx` files), you can do so in two ways:

1. `Configuration`. You can add a `datastoreOutDir` parameter to a Ulixee config file (`.ulixee/config.json` in the hierarchy of your project). The path should be relative to the `config.json` file.
2. `npx @ulixee/datastore build --out-dir=<path>`. During build, you can specify an out directory.

#### DBX Compliation Process

While your `.dbx` is being created, the following steps will occur:

1. Rollup source code into a single javascript file and sourcemap.
2. Build Documentation site configuration.
3. Generate and seed a Storage database.
4. Create a SHA 256 hash of the script.
5. Load any User-defined Manifest Settings (`${entrypoint}-manifest.json`, Project level `.ulixee/datastores.json`, Global settings). Details can be found [here](#manifest)
6. Lookup the Datastore runtime and version.
7. Add a previous `versionHash` to the linked versions, unless `linkedVersions` property in manifest is set to an empty list.
8. Hash the manifest details into a `versionHash`.
9. If deploying, Tar.gz the script, sourcemap and manifest into a `.dbx.gz file`

#### Deploying {#deploying}

You can copy `.dbx` folders (or compressed `.dbx.tgz` files) into the configured [`Datastore Storage`](./configuration.md#storage) directory of your CloudNode before boot-up, and the CloudNode will automatically unpack and install them.

NOTE: If you want to configure all your `.dbx` folders to be output to the same directory, you can use the `outDir` option of the build command.

### Typescript Support

The packager can optionally process Typescript files for you. If you have a unique Typescript setup, you can also point the packager at your output Javascript files. The Packager will automatically import any sourcemaps.

### ES Modules vs CommonJS

The packager can process ES Modules or CommonJS. It will output a commonjs file so that a Ulixee CloudNode can import it at runtime. The CloudNode will run your Datastore in an isolated Sandbox for each run. No memory or variables are shared between runs. ES Modules will result in more compact deployments by tree-shaking unneeded code.

### Versioning

Every version of your script is hashed using a SHA 256 algorithm, and encoded using Bech32m (a standard formalized by the Bitcoin working group to create file and url-safe base32 hash encodings).

When you package up a new version of your Datastore, it will maintain a list of the sequence of versions. Anytime your Datastore is used on a Ulixee CloudNode, it will return the latest version hash. This helps inform users of your Datastore when they're using an out-of-date version.

If you ever get out of sync with the versions that are on your CloudNode, you have two options.

1. Clear or add an empty `linkedVersions` field to a [manifest]{#manifest} file.
2. You'll also be prompted to link the CloudNode version history when you try to upload an out of date script.
3. You can also choose the CLI prompts to start a new version history.

## Manifest {#manifest}

When you package a Datastore, a Manifest is created with the following properties:

- versionHash `string`. The unique "hash" of your Datastore, used to version your script and refer to it in queries to remote CloudNodes. It includes all properties of the manifest excluding the versionHash. Hashing uses Sha3-256 encoded in a base32 format called bech32m.
- versionTimestamp `number`. A unix timestamp when a version was created.
- scriptHash `string`. A Sha3-256 hash of the rolled-up script. The encoding uses a base32 format called Bech32m so that it's file-path friendly.
- linkedVersions `{ versionHash: string, versionTimestamp: number }[]`. The history of linked versions with newest first. NOTE: this will be automatically maintained by the packager.
- scriptEntrypoint `string`. The relative path to your file (from the closest package.json).
- coreVersion `string`. The version of the Datastore Core module. Your script will be checked for compatibility with the CloudNode npm modules before it runs.
- schemaInterface `string`. A string containing a typescript declaration interface for all extractors in this Datastore.
- extractorsByName|crawlersByName `object`. A key value of Datastore Extractor/Crawler name to:
  - corePlugins `string`. An object containing a list of npm packages/versions that are core Extractor plugins.
  - prices `array`. Array of prices for each "step" in a function. The first entry is _this_ function's pricing.
    - minimum `number`. Optional minimum microgons that must be held in a Micronote for the given function step.
    - perQuery `number`. Optional price per query for the given Extractor (in Ulixee Sidechain microgons - 1 microgon = ~1/1,000,000 of a dollar).
    - addOns `object`. Optional price add-ons. Currently only `perKb` is supported.
    - remoteMeta `object`. Optional information about the remote Datastore Extractor being invoked (if applicable).
- tablesByName `object`. A key value of Datastore Table name to:
  - prices `array`. Array of prices for each "step" in a function. The first entry is _this_ function's pricing.
    - minimum `number`. Optional minimum microgons that must be held in a Micronote for the given function step.
    - remoteMeta `object`. Optional information about the remote Datastore Extractor being invoked (if applicable).
- paymentAddress `string`. Optional address to use with the Ulixee Sidechain for payments.

### Setting values:

Setting any of the above properties into the manifest will be incorporated into the manifest as it is built. For instance, to reset the version history, you can add the property `linkedVersions: []`.

### **GENERATED_LAST_VERSION**

This file will be automatically generated by the CLI. The full settings from the previous version will be added as a field called `__GENERATED_LAST_VERSION__`. The `versionHash` in this section is a good sanity check to compare versions on your local machine vs a CloudNode. By default, Ulixee CloudNodes store Datastores in the `<OS Cache Directory>/ulixee/datastores` directory ([details](./configuration.md#storage)).

### Setting Manifest Values

Settings for a Datastore can be configured in a few places.

1. Most settings can be configured in the Datastore itself.
2. `dbx` A file called `datastore-manifest.json` is created in your `.dbx` folder with your final settings. You can modify this file, but note that most changes will change your `versionHash`, so this should generally be a last resort.
3. `Entrypoint` A manifest can be created adjacent to your `scriptEntrypoint` with the extension replaced with `-manifest.json`. Eg, `src/sites/script1.ts` -> `src/sites/script1-manifest.json`
4. `Project` You can add a `.ulixee` folder in the hierarchy of your project (most commonly next to your package.json). Within this folder, you must create a `datastore.json` file. When you add this file, it will keep track of all uploaded `versionHashes`.

The file should have the following structure:

- Keys are a relative path from the datastore.json file to your scriptEntrypoint postfixed with `-manifest.json`.
- [Values](#manifest), which are updated by the packager automatically
- Top level settings: any settings you wish to apply to the manifest.

  ```json
  {
    "../src/sites/script1-manifest.json": {
       "linkedVersions": [],
       "__GENERATED_LAST_VERSION": {
         "versionHash": "dbx1n553mdww3ce0vg06k7",
         "versionTimestamp": 1657308272361,
         ...
      }
    }
  }
  ```

5. `Global` You can add a global configuration file at [`OS Cache Directory`](./configuration.md#cache)`/ulixee/datastores.json`. This file uses the same format as the `Project` level manifests, but keys are absolute paths.

   ```json
   {
     "/Users/Projects/endoscrape/src/sites/script1-manifest.json": {
       "linkedVersions": [],
       "__GENERATED_LAST_VERSION": {
         "versionHash": "dbx1n553mdww3ce0vg06k7",
         "versionTimestamp": 1657308272361,
         ...
       }
     }
   }
   ```

Manifest Settings take the following precedence:

1. `Global` settings.
2. `Project` settings.
3. `Entrypoint` settings.
4. `dbx` contents.

## Command Line Interface

You can build, interact and upload your Datastores using the packager module included as a devDependency of @ulixee/datastore.

You can also use a global Ulixee CLI: `npm install -g @ulixee/cli`.

### Deploying a .dbx

To build and upload a Datastore, you can use the embedded CLI tool to point at your script entrypoint:

```bash
 npx @ulixee/datastore deploy [path to datastore entrypoint]
```

... or via Ulixee CLI:

```bash
 ulixee datastore deploy [path to datastore entrypoint]
```

You must provide a path to the entrypoint of your Datastore. The default export of the node module needs to be an instance of a `DatastoreExecutable`.

Your Datastore will be built and uploaded transparently. No `.dbx` or working directory is persisted to the file system.

#### CLI Options

Options below show a short and long form.

- `-h, --cloud-host <host>`. Upload this package to the given host CloudNode. Will try to auto-connect if none specified.
- `-c, --clear-version-history` Clear out any version history for this script entrypoint (default: false)
- `-s, --compiled-source-path <path>` Path to the compiled entrypoint (eg, if you have a custom typescript config, or another transpiled language).
- `-t, --tsconfig <path>`. A path to a TypeScript config file (if needed). Will be auto-located based on the entrypoint if it ends in ".ts"
- `-i, --identity-path <path>`. A path to a Ulixee Identity. Necessary for signing if a CloudNode is running in `production` serverEnvironment - `NODE_ENV=production`. (env: ULX_IDENTITY_PATH)
- `-p, --identity-passphrase <path>`. A decryption passphrase to the Ulixee identity (only necessary if specified during key creation). (env: ULX_IDENTITY_PASSPHRASE)

### Building a .dbx.gz

To build a compressed Datastore and keep it on the filesystem, you can use the embedded CLI tool to point at your script entrypoint.

NOTE: this option is most useful when you plan to deploy your `.dbx.gz` files to many environments and want to preserve the same package.

```bash
 npx @ulixee/datastore build [path to datastore entrypoint]
```

... or via Ulixee CLI:

```bash
 ulixee datastore build [path to datastore entrypoint]
```

You must provide a path to the entrypoint of your Datastore. The default export of the node module needs to be an instance of a `DatastoreExecutable`.

Your Datastore will be compiled into a folder called `.dbx.build` directly next to your script. The folder contains your rolled up script, a sourcemap, and a manifest.json file. These files will be Tar Gzipped into a `.dbx` file with your script name appended with `.dbx`.

The build directory is automatically cleaned up after your upload.

#### CLI Options

Options below show a short and long form.

- `-u, --upload` `Boolean`. Upload this package to a Ulixee CloudNode after packaging. (default: false)
- `-h, --cloud-host <host>`. Upload this package to the given CloudNode host. Will try to auto-connect if none specified.
- `-o, --out-dir <path>` A directory path where you want packaged .dbx files to be saved
- `-c, --clear-version-history` Clear out any version history for this script entrypoint (default: false)
- `-s, --compiled-source-path <path>` Path to the compiled entrypoint (eg, if you have a custom typescript config, or another transpiled language).
- `-t, --tsconfig <path>`. A path to a TypeScript config file (if needed). Will be auto-located based on the entrypoint if it ends in ".ts"

### Developing a Datastore

While developing, the easiest way to run a Datastore is to start it from the CLI. You can optionally watch the files for changes. The Datastore will keep a single, temporary version hash in place of a sha-256 version to simplify querying during development.

If you upload using the CLI, you can use the following command:

```bash
 npx @ulixee/datastore start [path to pre-packaged datastore]
```

... or via Ulixee CLI:

```bash
 ulixee datastore start [path to pre-packaged datastore]
```

You must provide a path to the entrypoint of your script.

#### CLI Options

Options below show a short and long form.

- `-w, --watch` Monitor files for changes and continue to push new versions as they change.
- `-s, --compiled-source-path <path>` Path to the compiled entrypoint (eg, if you have a custom typescript config, or another transpiled language).
- `-o, --out-dir <path>` A directory path where you want packaged .dbx files to be saved.
- `-t, --tsconfig <path>`. A path to a TypeScript config file (if needed). Will be auto-located based on the entrypoint if it ends in ".ts"

### Installing a Datastore locally.

If you have an address of a remote Datastore you would like to install into your local project, you can run this command to add local typing:

```bash
 npx @ulixee/datastore install [versionHash]
```

... or via Ulixee CLI:

```bash
 ulixee datastore install [versionHash]
```

You must provide a versionHash to the Datastore to install. Types will become available in:

```js
import ITypes from '@ulixee/datastore/types';

type InputOutputDatastoreExtractorType = ITypes[versionHash][functionName];
```

#### CLI Options

Options below show a short and long form.

- `-a, --alias <name>`. Add a shortcut name to reference this Datastore hash. (eg, -a flights will let you use `ITypes['flights']['flightsDotCom']`)
- `-h, --host <host>`. Connect to the given host CloudNode. Will try to automatically connect if omitted.

## Datastore Core Sandboxes

When Datastores are run on a Cloud, they are initialized into a virtual machine sandbox that has no default access to Node.js, other than those explicitly allowed by a [Datastore Plugin](../advanced/plugins.md). Any dependencies imported by your script will be packaged into your script, but you should not expect NodeJs core modules to be available. Your script will also be fully isolated between runs - any shared state must be provided in via the `input` variables. This isolation ensures your script can be reproduced, re-run and troubleshooted reliably.

## Efficient Units

Once Datastores are deployed, the can be remotely queried using only the unique "Hash" of the datastore and any input configuration. The output will be the only information transmitted in response.

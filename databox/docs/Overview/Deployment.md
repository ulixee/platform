# Deployment

## Packaged Databoxes (.dbx)

Databoxes are packaged into a single javascript file for deployment. They include a sourcemap and manifest file indicating how to run the Databox. These files are TarGzipped into a final `.dbx` file.

We provide a packaging tool out of the box to combine your Databox and included modules into a single file. It can be run using the Databox CLI commands or the Ulixee CLI.

### Packaged .dbx Files

Your Databox will be packaged into a file with the same name and path as your script, but with the extension `.dbx`. These files are safe to check-in to source control so other developers on your team can package and deploy the databoxes without a need to re-build them. You can also drop them onto a server to [deploy](#deploying) them.

A `.dbx` file has the following files in it:

- `databox.js` The single file containing all your javascript code and a default export containing a `DataboxExecutable` instance.
- `databox.js.map` A source map for your javascript.
- `databox-manifest.json` A manifest file with a valid hash code. See Manifest section.

#### Out Directory

If you want to build all your `.dbx` files so they can be deployed manually onto a server (eg, if you have a Docker image and wish to pre-deploy `.dbx` files), you can do so in two ways:
1. `Configuration`. You can add a `databoxOutDir` parameter to a Ulixee config file (`.ulixee/config.json` in the hierarchy of your project). The path should be relative to the `config.json` file.
2. `npx @ulixee/databox build --out-dir=<path>`. During build, you can specify an out directory. 

#### Working Directory

While your `.dbx` file is being created, a working directory will be created at `<Path to dbx>.build`. The process for creating a `.dbx` is:

1. Unpack any existing `.dbx`.
2. Rollup source code into a single javascript file and sourcemap.
3. Create a SHA3 256 hash of the script.
4. Load any User-defined Manifest Settings (`${entrypoint}-manifest.json`, Project level `.ulixee/databoxes.json`, Global settings). Details can be found [here](#manifest)
5. Lookup the Databox runtime and version.
6. Add a previous `versionHash` to the linked versions, unless `linkedVersions` property in manifest is set to an empty list.
7. Hash the manifest details into a `versionHash`.
8. Tar.gz the script, sourcemap and manifest into a `.dbx file`

#### Unpacking

Packaged Databox files are simply GZIP compressed Tar files. You can use normal Unix (or other) commands to explore their contents:

`tar -xf script.dbx`

#### Deploying {#deploying}

You can copy `.dbx` files into the configured [`Databox Storage`](/docs/databox/overview/configuration#storage) directory of your server before boot-up, and the server will automatically unpack and install them.

NOTE: If you want to configure all your `.dbx` files to be output to the same directory, you can use the `outDir` option of the build command.

### Typescript Support

The packager can optionally process Typescript files for you. If you have a unique Typescript setup, you can also point the packager at your output Javascript files. The Packager will automatically import any sourcemaps.

### ES Modules vs CommonJS

The packager can process ES Modules or CommonJS. It will output a commonjs file so that Ulixee Server can import it on a server. The server will run your Databox in an isolated Sandbox for each run. No memory or variables are shared between runs. ES Modules will result in more compact deployments by tree-shaking unneeded code.

### Versioning

Every version of your script is hashed using a SHA3 256 algorithm, and encoded using Bech32m (a standard formalized by the Bitcoin working group to create file and url-safe base32 hash encodings).

When you package up a new version of your Databox, it will maintain a list of the sequence of versions. Anytime your Databox is used on a Core Server, it will return the latest version hash. This helps inform users of your Databox when they're using an out-of-date version.

If you ever get out of sync with the versions that are on your server, you have two options.

1. Clear or add an empty `linkedVersions` field to a [manifest]{#manifest} file.
2. You'll also be prompted to link the server version history when you try to upload an out of date script.
3. You can also choose the CLI prompts to start a new version history.

## Manifest {#manifest}

When you package a Databox, a Manifest is created with the following properties:

- versionHash `string`. The unique "hash" of your Databox, used to version your script and refer to it in queries to remote Servers. It includes all properties of the manifest excluding the versionHash. Hashing uses Sha3-256 encoded in a base32 format called bech32m.
- versionTimestamp `number`. A unix timestamp when a version was created.
- scriptHash `string`. A Sha3-256 hash of the rolled-up script. The encoding uses a base32 format called Bech32m so that it's file-path friendly.
- linkedVersions `{ versionHash: string, versionTimestamp: number }[]`. The history of linked versions with newest first. NOTE: this will be automatically maintained by the packager.
- scriptEntrypoint `string`. The relative path to your file (from the closest package.json).
- coreVersion `string`. The version of the Databox module. Your script will be checked for compatibility with the Server npm modules before it runs.
- corePlugins `string`. An object containing a list of npm packages/versions that are core Databox plugins.
- paymentAddress `string`. Optional address to use with the Ulixee Sidechain for payments.
- pricePerQuery `number`. Optional price per query (in Ulixee Sidechain microgons - 1 microgon = ~1/1,000,000 of a dollar).
- creditAddress `string`. Optional Ulixee Sidechain address that is valid for credits issued to developers.

### Setting values:

Setting any of the above properties into the manifest will be incorporated into the manifest as it is built. For instance, to reset the version history, you can add the property `linkedVersions: []`.

### __GENERATED_LAST_VERSION__

This file will be automatically generated by the CLI. The full settings from the previous version will be added as a field called `__GENERATED_LAST_VERSION__`. The `versionHash` in this section is a good sanity check to compare versions on your local machine vs a Server. By default, Ulixee Servers store Databoxes in the `<OS Cache Directory>/ulixee/databoxes` directory ([details](/docs/databox/overview/configuration#storage)).

### Setting Manifest Values

Settings for a Databox can be configrued in a few places.

1. `dbx` A file called `databox-manifest.json` is created in your `.dbx` file with your final settings. You can modify this file, but note that most changes will change your `versionHash`, so this should generally be a last resort.
2. `Entrypoint` A manifest can be created adjacent to your `scriptEntrypoint` with the extension replaced with `-manifest.json`. Eg, `src/sites/script1.ts` -> `src/sites/script1-manifest.json`
3. `Project` You can add a `.ulixee` folder in the hierarchy of your project (most commonly next to your package.json). Within this folder, you must create a `databox.json` file. When you add this file, it will keep track of all uploaded `versionHashes`.

The file should have the following structure:

- Keys are a relative path from the databox.json file to your scriptEntrypoint postfixed with `-manifest.json`.
- [Values](#manifest), which are updated by the packager automatically
- Top level settings: any settings you wish to apply to the manifest.

  ```json
  {
    "../src/sites/script1-manifest.json": {
       "linkedVersions": [],
       "__GENERATED_LAST_VERSION": {
         "versionHash": "dbx1n553mdww3ce0vg06k7lmsh49cvfs6a6lqcjmv7h0hpseqn5knd6sxapkc6",
         "versionTimestamp": 1657308272361,
         ...
      }
    }
  }
  ```

5. `Global` You can add a global configuration file at [`OS Cache Directory`](/docs/databox/overview/configuration#cache)`/ulixee/databoxes.json`. This file uses the same format as the `Project` level manifests, but keys are absolute paths.

   ```json
   {
     "/Users/Projects/endoscrape/src/sites/script1-manifest.json": {
       "linkedVersions": [],
       "__GENERATED_LAST_VERSION": {
         "versionHash": "dbx1n553mdww3ce0vg06k7lmsh49cvfs6a6lqcjmv7h0hpseqn5knd6sxapkc6",
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

You can build, interact and upload your Databoxes using the packager module included as a devDependency of @ulixee/databox.

You can also use a global Ulixee CLI: `npm install -g @ulixee/cli`.

### Deploying a .dbx

To build and upload a Databox, you can use the embedded CLI tool to point at your script entrypoint:

```bash
 npx @ulixee/databox deploy [path to databox entrypoint]
```

... or via Ulixee CLI:

```bash
 ulixee databox deploy [path to databox entrypoint]
```

You must provide a path to the entrypoint of your Databox. The default export of the node module needs to be an instance of a `DataboxExecutable`.

Your Databox will be built and uploaded transparently. No `.dbx` or working directory is persisted to the file system.

#### CLI Options

Options below show a short and long form.

- `-h, --upload-host <host>`. Upload this package to the given host server. Will try to auto-connect if none specified.
- `-c, --clear-version-history` Clear out any version history for this script entrypoint (default: false)
- `-s, --compiled-source-path <path>` Path to the compiled entrypoint (eg, if you have a custom typescript config, or another transpiled language).
- `-t, --tsconfig <path>`. A path to a TypeScript config file (if needed). Will be auto-located based on the entrypoint if it ends in ".ts"
-

### Building a .dbx

To build a Databox and keep it on the filesystem, you can use the embedded CLI tool to point at your script entrypoint. 

NOTE: this option is most useful when you plan to deploy your `.dbx` files to many environments and want to preserve the same package.

```bash
 npx @ulixee/databox build [path to databox entrypoint]
```

... or via Ulixee CLI:

```bash
 ulixee databox build [path to databox entrypoint]
```

You must provide a path to the entrypoint of your Databox. The default export of the node module needs to be an instance of a `DataboxExecutable`.

Your Databox will be compiled into a folder called `.dbx.build` directly next to your script. The folder contains your rolled up script, a sourcemap, and a manifest.json file. These files will be Tar Gzipped into a `.dbx` file with your script name appended with `.dbx`.

The build directory is automatically cleaned up after your upload.

#### CLI Options

Options below show a short and long form.

- `-u, --upload` `Boolean`. Upload this package to a Ulixee Server after packaging. (default: false)
- `-h, --upload-host <host>`. Upload this package to the given host server. Will try to auto-connect if none specified.
- `-o, --out-dir <path>` A directory path where you want packaged .dbx files to be saved
- `-c, --clear-version-history` Clear out any version history for this script entrypoint (default: false)
- `-s, --compiled-source-path <path>` Path to the compiled entrypoint (eg, if you have a custom typescript config, or another transpiled language).
- `-t, --tsconfig <path>`. A path to a TypeScript config file (if needed). Will be auto-located based on the entrypoint if it ends in ".ts"

### Uploading a .dbx

You can upload Databoxes to a Ulixee Server automatically when you package them. If you decide to first examine the package, you can also choose to upload later (or deploy directly to the [Databoxes directory](/docs/databox/overview/configuration#storage) during your Server installation).

If you upload using the CLI, you can use the following command:

```bash
 npx @ulixee/databox upload [path to pre-packaged databox]
```

... or via Ulixee CLI:

```bash
 ulixee databox upload [path to pre-packaged databox]
```

You must provide a path to the pre-packaged `.dbx` file (eg, `<pathToScript/scriptNameMinusExtension>.dbx`).

#### CLI Options

Options below show a short and long form.

- `-h, --upload-host <host>`. Upload this package to the given host server. Will try to auto-connect if none specified.
- `-a, --allow-new-version-history` Allow uploaded Databox to create a new version history for the script entrypoint. (default: false)

### Opening a .dbx

You can open a Databox `.dbx` into it's working directory using the open command:

```bash
 npx @ulixee/databox open [.dbxFile]
```

... or via Ulixee CLI:

```bash
 ulixee databox open [.dbxFile]
```

You must provide a path to a pre-packaged `.dbx` file (eg, `<pathToScript/scriptNameMinusExtension>.dbx`).

### Closing a .dbx

You can close a Databox `.dbx` file after you're done inspecting the contents. Changes are automatically repackaged into the `.dbx`. NOTE: no manifest changes are examined, so if you change contents, you might break the versionHash.

```bash
 npx @ulixee/databox close [.dbxFile]
```

... or via Ulixee CLI:

```bash
 ulixee databox close [.dbxFile]
```

You must provide a path to the `.dbx` file.

#### CLI Options

Options below show a short and long form.

- `-x, --discard-changes` The working for the given .dbx file. Defaults to a `.dbx.build/[scriptFilename]` directory next to the dbx file.

## Databox Core Sandboxes

When Databoxes are run on a Server, they are initialized into a virtual machine sandbox that has no default access to Node.js, other than those explicity allowed by a [Databox Plugin](/docs/databox/databox-basics/plugins). Any dependencies imported by your script will be packaged into your script, but you should not expect NodeJs core modules to be available. Your script will also be fully isolated between runs - any shared state must be provided in via the `input` variables. This isolation ensures your script can be reproduced, re-run and troubleshooted reliably.

## Efficient Units

Once Databoxes are deployed, the can be remotely queried using only the unique "Hash" of the databox and any input configuration. The output will be the only information transmitted in response.

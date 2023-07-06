# Cloning

> Every Datastore can be cloned and extended with additional functionality.

Cloning is a command-line driven process to create a "copy" of a Datastore. All functionality that is cloned will continue to run on the remote server using [Passthrough Extractors](./passthrough-extractor.md) and [Passthrough Tables](./passthrough-table.md). You can mix-and-match local [Extractors](./extractor.md), [Crawlers](./crawler.md) and [Tables](./table.md) as you see fit.

### Upstream

When you clone a Datastore, the source Datastore is considered to be the "upstream" Datastore.

### Payment

If an upstream requires payment, your Datastore will need to provide payment. This can either come in the form of "embedded" [Credits](../advanced/credits.md), or allowing a user's payments to pass through.

To embed credits, you can manipulate your Datastore directly to include [remoteDatastoreEmbeddedCredits](./datastore.md#constructor), or provide the Credit details to the CLI.

NOTE: To ensure a smooth use of credits, you are not able to grant more Credits to your users than the amount issued to the embedded Credits.

## Command Line Interface (CLI) {#cli}

To clone a Datastore, you simply run the following command with the url of the "to-be-cloned" Datastore (eg, `ulx://153.23.22.255:8080/ulixee-docs/1.0.0` is a theoretical Datastore url).

```bash
 npx @ulixee/datastore clone <datastore url> <local path>
```

... or via Ulixee CLI:

```bash
 ulixee datastore clone <datastore url> <local path>
```

You must provide a `datastore url` to the Datastore you wish to clone. A `datastore url` takes the form `ulx://<IP>:<PORT>/<Datastore Version>`.

The second argument (`local path`) is a path where you wish to export the generated Typescript or Javascript file. If your path ends with `.ts`, Typescript will be emitted. Otherwise, commonjs friendly Javascript will be emitted.

#### CLI Options

Options below show a short and long form.

- `-c, --credits <credit json>`. Include [credits](../advanced/credits.md) from the upstream Datastore. These credits will be used by your Datastore to grant upstream access your own users.

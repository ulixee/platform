# Configuration

### Cluster Configuration

When you deploy multiple Cloud Nodes, you will need to cluster them to centralize services used by your node like storage, statistics and payments. See [Hosted Services](../advanced/hosted-services.md) for more details.

Many of these settings are available when you start a [Cloud Node](https://ulixee.org/docs/cloud) with the Ulixee CLI.

```bash
$ npx @ulixee/cloud start --help
```

- **--hosted-services-port <number>** Activate hosted services on this node at this port (datastore registry, node registry). Defaults to any 18181, or any available port (0). (env: `ULX_HOSTED_SERVICES_PORT`)
- **--hosted-services-hostname <hostname>** The ip or host that Cluster Services should listed on. You should make this a private-to-your-cloud ip if possible. (env: `ULX_HOSTED_SERVICES_HOSTNAME`)

NOTE: most of the time, you will only setup this url for any cluster nodes that need to connect to the hosted services.
- **--setup-host <host>** Setup services for this node with another node in your cluster. NOTE: this should be the hosted services address of
  your cluster node. (env: `ULX_SERVICES_SETUP_HOST`)

If you need to configure the services directly, you can use the following environment variables:

```ini
ULX_DATASTORE_STATS_HOST=# Stats Tracker Service Host
ULX_DATASTORE_REGISTRY_HOST=# Datastore Registry Service Host
ULX_STORAGE_ENGINE_HOST=# Storage Engine Service Host
ULX_REPLAY_REGISTRY_HOST=# Replays Storage/Retrieval Host
ULX_PAYMENT_PROCESSOR_HOST=# A Payment Processor Service Host (processes payments)
ULX_UPSTREAM_PAYMENTS_SERVICE_HOST=# Payment Services Host
ULX_DATASTORE_LOOKUP_SERVICE_HOST=# Datastore Lookup Service Host
```

### Argon Payment Configuration

Your Argon Localchain configuration should be setup only on a Payment Services Host. Received payments will be sent to this Localchain. In order to properly claim them, you should ensure to follow the [payment setup guide](../advanced/payments.md).

#### Using the Cloud Node Cli

```bash
$ npx @ulixee/cloud start \
    --argon-localchain-path /path/to/localchain \
    --argon-mainchain-url wss://rpc.testnet.argonprotocol.org
    --argon-localchain-password-interactive \
    
```

OR you can tell the Cloud Node to boot up a Localchain for you:

```bash
$ npx @ulixee/cloud start \
    --argon-localchain-create-if-missing \
    --argon-mainchain-url wss://rpc.testnet.argonprotocol.org
```

#### Environment Variables

These are the environment variables that can be used to configure the localchain connection.

```ini
ARGON_LOCALCHAIN_PATH=# Path to the localchain
ARGON_LOCALCHAIN_CREATE_IF_MISSING=# Create a localchain if it doesn't exist
ARGON_MAINCHAIN_URL=# Default Argon mainchain host
ARGON_BLOCK_REWARDS_ADDRESS=# A vote output address for the localchain (activates vote creation)
ARGON_NOTARY_ID=1 # The preferred notary to use
# Localchain Password Options
ARGON_LOCALCHAIN_PASSWORD_INTERACTIVE_CLI=# prompt
ARGON_LOCALCHAIN_PASSWORD_FILE=# path to file
ARGON_LOCALCHAIN_PASSWORD=# inline password
```

### Default Connection

If no connectionToCore is provided to a Datastore, a localhost CloudNode connection will attempt to be automatically discovered.

### Datastore Core Storage {#storage}

Datastore Core stores and retrieves [packaged Datastores](./deployment) from a configurable location on a machine. This directory will contain:

1. `dbx*`. Packaged datastores organized into folders by their <datastoreId>@v${version}.
2. `metadata.db`. A sqlite3 file containing version history of all Datastores installed locally. This index will be automatically updated if new compressed .dbx.tgz files are added to the directory.
3. `stats.db`. A sqlite3 file containing stats for runs of queries
4. `storage`. Databases created as storage engines for each Datastore. The path is the same as the dbx path.

During boot-up, any Packaged Datastores (`.dbx.tgz`) in this directory will be automatically unpacked and loaded.

### Server Environment {#env}

The server environment a Datastore runs in will alter a few default settings. Current environment options are `development` and `production`. Production mode imposes the following limitations:

1. All [Admin](#admin) APIs require an AdminIdentity. The Server must install one by default. If none is provided, a temporary AdminIdentity will be output on the console during startup (configured via `options.cloudAdminIdentities` or environment variable `ULX_CLOUD_ADMIN_IDENTITIES`).
2. You cannot run `localScripts` through a Datastore Core. They must be packaged and deployed to the server.

### Server Admin Identities {#admin}

Datastore Core installs some administrative features for built-in Datastores. This currently includes things like:

- [Credits](../advanced/credits.md): issuing trial credits to consumers of your Datastore(s). An Admin Identity is required to create new Credits.
- Access for an Admin to run private javascript functions on [Tables](../basics/table.md), [Extractors](../basics/extractor.md) and [Crawlers](../basics/crawler.md).
- Ability to "upload" packaged Datastores to a live server in `production` [mode](#env).

#### Environment Variable

- ULX_DATASTORE_DIR `string`. Absolute path to a directory containing Datastores. Defaults to `<DATA>/ulixee/datastores`.
- ULX_QUERY_HERO_SESSIONS_DIR `string`. Absolute path to a directory storing the Hero Session databases output by Datastores. Defaults to `<DATA>/ulixee/query-hero-sessions`.
- ULX_CLOUD_ADMIN_IDENTITIES `string`. # A whitelist of comma separated identities (bech32 strings) who can administer this server

## Data Directory {#data}

DATA is determined as:

- Mac: ~/Library/Application Support
- Linux: ~/.local/share (environment variable `XDG_DATA_HOME`)
- Windows: ~/AppData/Local (environment variable `LOCALAPPDATA`)

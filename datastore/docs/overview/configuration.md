# Configuration

### Default Connection

If no connectionToCore is provided to a Datastore, a localhost CloudNode connection will attempt to be automatically discovered.

### Datastore Core Storage {#storage}

Datastore Core stores and retrieves [packaged Datastores](./deployment) from a configurable location on a machine. This directory will contain:

1. `dbx*`. Packaged datastores organized into folders by their <datastoreId>@v${version}.
2. `metadata.db`. A sqlite3 file containing version history of all Datastores installed locally. This index will be automatically updated if new compressed .dbx.tgz files are added to the directory.
3. `stats.db`. A sqlite3 file containing stats for runs of queries
4. `storage`. Databases created as storage engines for each Datastore. The path is the same as the dbx path.

During bootup, any Packaged Datastores (`.dbx.tgz`) in this directory will be automatically unpacked and loaded.

### Server Environment {#env}

The server environment a Datastore runs in will alter a few default settings. Current environment options are `development` and `production`. Production mode imposes the following limitations:

1. All [Admin](#admin) APIs require an AdminIdentity. The Server must install one by default. If none is provided, a temporary AdminIdentity will be output on the console during startup (configured via `options.cloudAdminIdentities` or environment variable `ULX_Cloud_ADMIN_IDENTITIES`).
2. You cannot run `localScripts` through a Datastore Core. They must be packaged and deployed to the server.

### Server Admin Identities {#admin}

Datastore Core installs some administrative features for built-in Datastores. This currently includes things like:

- [Credits](../advanced/credits.md): issuing trial credits to consumers of your Datastore(s). An Admin Identity is required to create new Credits.
- Access for an Admin to run private javascript functions on [Tables](../basics/table.md), [Extractors](../basics/extractor.md) and [Crawlers](../basics/crawler.md).
- Ability to "upload" packaged Datastores to a live server in `production` [mode](#env).

#### Environment Variable

- ULX_DATASTORE_DIR `string`. Absolute path to a directory containing Datastores. Defaults to `<DATA>/ulixee/datastores`.
- ULX_QUERY_HERO_SESSIONS_DIR `string`. Absolute path to a directory storing the Hero Session databases output by Datastores. Defaults to `<DATA>/ulixee/query-hero-sessions`.


#### Data Directory {#data}

DATA is determined as:

- Mac: ~/Library/Application Support
- Linux: ~/.local/share (environment variable XDG_DATA_HOME)
- Windows: ~/AppData/Local (environment variable LOCALAPPDATA)

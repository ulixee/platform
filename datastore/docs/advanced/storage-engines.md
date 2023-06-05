# Storage Engines

> Storage Engines centralize the underlying sql storage and querying for a Datastore. A Datastore uploaded to a cloud must use a storageEngineHost to ensure data is available across all nodes.

## Configuring

When you upload a Datastore to a cloud, it will require you to set the `storageEngineHost` in the Datastore before uploading. You can also change out this ip:port locally to test out migrations or simply run tests against the production database.

## Payment

Storage Engines operate very similarly to Datastores. They can set their price per kb of data returned.

## Underlying Engine

The current underlying engine for Storage Engines is Sqlite3. However, it's expected that we will add Postgres and other engines in the future.

# Hosted Services

> Hosted Services centralize the storage of Datastores, Statistics and Hero Replays for a cluster of DatastoreCores.

The following is a list of the services and their descriptions. Many of these services can also be configured using the `npx @ulixee/cloud start` command.

## Setup Host

This is the address of a node in your cluster that has the services setup. This is used to configure the services for any non-leader nodes.

**Environment Variable:** `ULX_SERVICES_SETUP_HOST`

## StatsRegistry

This service centralizes the logging and tracking of statistics for Datastore Queries and individual Entities (crawlers, extractors and tables).

**Environment Variable:** `ULX_DATASTORE_STATS_HOST`

## DatastoreRegistry

This service centralizes the storage of Datastores so they can be used across a cluster of servers. A single server will serve as the cluster repository, and the other nodes will cache Datastores, but use this as the end location.

**Environment Variable:** `ULX_DATASTORE_REGISTRY_HOST`

## DatastoreLookupService

This service centralizes the lookup of Datastore Domains. There's a time and effort cost to lookup a Datastore, so this service caches the lookup results.

**Environment Variable:** `ULX_DATASTORE_LOOKUP_SERVICE_HOST`

## StorageEngine

This service centralizes the storage of Datastore's underlying SQLite databases so they can be used across a cluster of servers. A single server will serve as the cluster repository, and the other nodes will forward requests to this server.

**Environment Variable:** `ULX_STORAGE_ENGINE_HOST`

## ReplayRegistry

This service centralizes the storage of Hero Replays so they can be used across a cluster of servers. Hero Replays serve as the underlying data for cached Crawlers, so must be preserved until the cache expires.

**Environment Variable:** `ULX_REPLAY_REGISTRY_HOST`

# Hosted Services for Argon Payments

## PaymentProcessorService

This service centralizes the verification and finalizing of the Micropayment Channel payments created by datastore consumers. It's used to ensure that channelHolds are properly settled and that clients cannot double-spend across multiple nodes. This service requires a disk-local Localchain instance to claim the channelHolds.

**Environment Variable:** `ULX_PAYMENT_PROCESSOR_HOST`

If accepting payments, you must either set this or configurations for a Localchain path.

## UpstreamPaymentsService

This service is necessary if your Datastore clones another Datastore that requires payments. This payment service will be used to pay for embedded requests to upstream Datastores. A cluster can share a single payment service to reduce complexity. It can also re-use the Localchain used to accept ChannelHold Payments.

**Environment Variable:** `ULX_UPSTREAM_PAYMENTS_SERVICE_HOST`

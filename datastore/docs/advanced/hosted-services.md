# Hosted Services

> Hosted Services centralize the storage of Datastores, Statistics and Hero Replays for a cluster of DatastoreCores.

## StatsRegistry

This service centralizes the logging and tracking of statistics for Datastore Queries and individual Entities (crawlers, extractors and tables).

## DatastoreRegistry

This service centralizes the storage of Datastores so they can be used across a cluster of servers. A single server will serve as the cluster repository, and the other nodes will cache Datastores, but use this as the end location.

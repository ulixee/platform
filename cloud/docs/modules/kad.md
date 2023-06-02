# Ulixee s/Kademlia Distributed Hash Table

Ulixee Clouds use a distributed hash table that uses the s/kademlia (kad) specification for discovery of nodes and "providers" (or host-ers) of Datastores throughout the network.

## What is a Distributed Hash Table?

A distributed hash table (or DHT) is a lookup table for nodes and data that can run across a number of unrelated (or decentralized) nodes. These nodes are able to use the DHT to content and other nodes throughout a network without any central locator table.

A DHT works by using each Node's "nodeId" to find the "closest" nodeIds in the network to a given key or other nodeId. This "closeness" is determined using an "xor" of the bits of two different buffers. Nodes keep track "buckets" of ids starting with different prefixes. When a node needs to find content (a sha256 hash of the content) in the network, it finds the nodeIds closest to the content hash and then asks each of those nodes if it knows the given content "provider" or any closer nodes. This process repeats for the closer nodes until the content is found (or no closer options are available).

## Network Identities (NodeIds)

The secure (s) part of Kademlia is provided by using "network ids" that are ED25519 keypairs. The public key of this keypair is encoded into an identity on the network. This `Identity` (`@ulixee/crypto/lib/Identity`) has a "Bech32m"\* public encoding (ie, `id1xv7empyzlwuvlshs2vlf9eruf72jeesr8yxrrd3esusj75qsr6jqj6dv3p`). You can always identify an identity using the `id1` prefix.

Public keys provide a cryptographic randomization that prevent attacks on the network where simulated ids try to corner off lookups of certain values. Nodes must provide their public key and verify they own them during the initial handshake.

\*Bech32m is a specification created for Bitcoin that encodes a buffer into a Base32 encoding with a checksum to avoid mistyping keys.

## Bootstrapping

Nodes must have at least 1 bootstrap node (`host/nodeId`) to connect to. The initial node(s) will be used to seed a Routing Table containing a distribution of nodeIds across the network containing various "prefixes".

## Protocol

The Ulixee Kad works by attaching to an http/s server and communicating over JSON websockets. JSON is serialized with typing information.

## Usage

This API is not meant to be used outside of a CloudNode. You can start a CloudNode with the following properties to activate the service:

- cloudType: `private | public`. A public node will automatically enable the kad.
- networkIdentity: `Identity`. The KAD network identity to use to verify this node id.
- kadEnabled `boolean`. Must be set to true to activate the kad. Will default to true if this node is registered as `cloudType: public`.
- kadDbPath `string`. The KAD database path where NodeInfo and Providers will be stored.
- kadBootstrapPeers `string[]`. Peers to connect to to build routing tables. These must include a host, and can optionally include a nodeId (`host/nodeId`) for security.

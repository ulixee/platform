This is a variation of the s/kademlia Distributed Hashtable specification. It was forked from the implementation created by Libp2p at (https://github.com/libp2p/js-libp2p-kad-dht).

This version of s/kad:
- Uses Ulixee Identities as kad node identifiers (ed25519 kpi).
- Does not include a specification for put/getting values on the kad. It is only for node discovery and publishing "provider" capability.
- Discovery is exclusively via bootstrap peer lists (`host/nodeId`)
- All keys are sha256, apart from NodeIds, which use the underlying Ed25519 public keys in the kad.
- Kad connections must prove public key ownership on connection (Kad.connect + Kad.verify). A nonce exchange + kpi signature is used for forward secrecy.
- All encryption is expected to be applied at the containing transport level (ie, server ssl)
- Transport serialization uses JSON with embedded type information (@ulixee/commons/lib/TypeSerializer).

Future work:
- This KAD should move to WebTransport as soon as available to fix head of line blocking with the websockets and add multiplexing over a single socket. It allows for self-signed certificates for ips, which are a good fit for a decentralized network.
- Add api rate limiting + bad actor ip lists.

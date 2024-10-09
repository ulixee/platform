# Databrokers

> Databrokers allow you to handle the management of Argon Localchain payment for your team or customers. Instead of each team member needing to manage their own Argon wallet, they can use a shared Databroker to access the data they need.

## How it works

Databrokers whitelist users and Datastore domains and allocate funds to the users (how you allocate funds is up to you). This can be done through an admin interface or by directly interacting with the Databroker API.

When a user requests data from a Datastore, the Databroker will automatically create a [ChannelHold](#channelHolds) for the user and Datastore with "delegated signing" activated. Delegated signing means the [Client](#client-usage) library will generate a signing key (a Schnorrkel x25519 private key), and will send the [Address](https://docs.substrate.io/reference/glossary/#ss58-address-format) as part of the request to the Databroker. It's now up to the Delegated Signing key to sign settlements for the ChannelHold.

## Client Usage

The client usage is through the normal Ulixee [Client](https://ulixee.org/docs/client) library. Assuming you have a Databroker account and identity registered, your code will look like this:

```typescript
import { Client } from '@ulixee/client';

const argonMainchainUrl = 'wss://rpc.testnet.argonprotocol.org';
const brokerAddress = 'wss://broker.testnet.ulixee.org';
const domain = 'UsCPI.Stats/v1.0.0';
const paymentService = await DefaultPaymentService.fromBroker(brokerAddress, {
  pemPath: 'path to your Identity pem file',
});
const client = new Client(`ulx://${domain}`, {
  paymentService,
  argonMainchainUrl,
});
client.query(`SELECT * FROM publishingSchedule`).then(records => {
  console.log(records);
});
```

## Server Installation

Databrokers are built to run as a CLI. A Datastore doesn't need to do anything special to support Databrokers. The Databroker CLI will automatically handle the Argon Localchain payment and data access at a client level.

```bash
npm install @ulixee/databroker
```

## Server Usage

You can start a Databroker using the CLI. There's an optional admin interface that allows you to easily manage users, organizations, and channelHolds. You can see an example of hiding this behind a reverse proxy <a href="https://github.com/ulixee/ulixee/blob/main/datastore/broker/nginx.conf" target=_blank>here</a>.

```bash
$ @ulixee/databroker start --port 8080 --hostname localhost --admin-port 8081 \
  --storage-dir /path/to/storage --localchain-path /path/to/localchain
```

### Options

- **-p, --port <number>** The port to use. Defaults to any 1814, or any available port. (env: `ULX_DATABROKER_PORT`)
- **-u, --hostname <hostname>** The hostname the public facing apis should listen on. (env: `ULX_HOSTNAME`)
- **--admin-port <number>** The port to start an admin server (datastore registry, node registry). Defaults to 18171, or any available port (0). (env:
  ULX_DATABROKER_ADMIN_PORT)
- **--storage-dir \<dir\>** Override the default storage directory where the Databroker databases are located. (env: `ULX_DATABROKER_DIR`)
- **--env <path>** Load environment settings from a .env file.
- **--localchain-path <path>** The path to the localchain data directory. You can also configure this using the .env file (env: `ARGON_LOCALCHAIN_PATH`)

## Internal Structure

Databrokers track information in a SQLite database. The database contains the following tables:

### Organizations

Databrokers can create one or more Organizations. Each organization has a unique ID and a name. Organizations can have one or more users.

### Users

Users are members of an organization with a name and an Identity (a bech32 encoded Ed25519 key). Users will use this identity to sign requests to the Databroker.

### ChannelHolds

Argon micropayments are made through a ChannelHold, which is a pre-allocation of funds with updating settlements each time you pass a new threshold (1 milligon).

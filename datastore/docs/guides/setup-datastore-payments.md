# Setup Datastore Payments

> Datastore payments can be as easy as setting a price for your Datastore and adding a flag to your CloudNode configuration. This guide will walk you through the steps to setup your Datastore with payments.

### Background

There are a lot of concepts around payments described [here](../basics/payments.md#concepts). These might be helpful to understand before you setup your Datastore with payments.

## 1. Install CloudNode

When you install Ulixee Cloud, it will install a few dependencies:

- `@ulixee/cloud` - The main package for running a CloudNode
- `@argonprotocol/localchain` - A package for interacting with the Argon Localchain, which is used for payments.
- `@ulixee/datastore` - The main package for running a Datastore
- `@ulixee/datastore-plugins-hero` - A package for running Hero-wrapped Datastore

```bash
npm install @ulixee/cloud
```

## 2. Setup your Localchain

The easy way to start your Localchain is to simple add the following command to your ulixee start script:

```bash
npx @ulixee/cloud start --argon-localchain-create-if-missing
```

When you do this, a Localchain named "primary" will be created for you in the default [location](https://github.com/argonprotocol/mainchain/tree/main/docs/localchain.md#command-line-interface).

> A Localchain can only be used by a single process at a time. If you're running multiple Datastores, you might find it useful to use the `--argon-localchain-path` parameter to place the Localchain in a folder local to your project.

You can choose to add more features to your Localchain setup like a password, a type of public key signing, or a different location. Details are available in the [Cloud configuration settings](../overview/configuration.md#argon-payment-configuration).

## 3. Optional: Determine your Argon Block Rewards Address

Datastores can earn up to 25% of the block rewards from the Argon mainchain. This includes Argons that you can buy data with, as well as ownership tokens that grant you rights to mine in the network. You can set this address in your CloudNode configuration (env var: `ARGON_BLOCK_REWARDS_ADDRESS`), or with a cli command to your `@ulixee/cloud` start command.

```bash
npx @ulixee/cloud start \
  --argon-block-rewards-address=5DfXFKuCXHuyzdpo1ih3yizabyAC47frbbCidKjFsw3ucs8C
```

You can learn more about creating an account [here](./using-localchain.md#create-an-account).

## 4. Configure your Datastore

### Add a Price

Datastore pricing is set in "Microgons", which are one millionth of an Argon (or said differently, 1/1000 of a penny). You can set a price for your Datastore by adding a `basePrice` to the entities in your Datastore.

```typescript
import Datastore, { Extractor } from '@ulixee/datastore';

const datastore = new Datastore({
  name: 'HelloWorld',
  extractors: {
    // Add a price of 1 milligon (a penny)
    basic: new Extractor({
      basePrice: 1_000,
      async run({ Output }) {
        for (const line of ['hello', 'world']) {
          Output.emit({
            line,
          });
        }
      },
    }),
  },
});

export default datastore;
```

### Optional: Add a Domain

You can add a domain to your Localchain to help users lookup the ip hosting AND payment information in the same place. This can be very useful for using public hosting (there will be public Datastore hosting services in the near future). You can learn more about adding a domain [here](./register-a-domain.md).

## 5. Deploy your Datastore

Now you can deploy your Datastore to the CloudNode from step 1/2. You will need port 1818 available publicly by default on that server.

To deploy your datastore, from the location of your Datastore project, run (assuming your file is called `datastore.ts`):
```bash
npx @ulixee/cloud deploy ./datastore.ts \
  --cloud-host <your-host>:1818
```
<br/>

> Note: you can secure admin activities like these by supplying [`Admin Identities`](../overview/configuration.md#admin) to your CloudNode.

## 6. Test Querying with Payments

Ok, you're all set!

Now you can test out using the `@ulixee/client` with payments enabled. Read how to do that [here](./querying-datastores.md).

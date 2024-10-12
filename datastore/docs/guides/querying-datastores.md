# Querying Datastores

The primary way you'll interact with Datastores is the `@ulixee/client` library. The client library allows you to use an addressing system to lookup datastores by version and id, and then run queries against them using SQL. You can learn the details of the client library [here](../../client).

## Using a Localchain

Datastores that require payment use the [Argon currency](https://argonprotocol.org). You can learn more about the Argon [here](./using-localchain.md). You can directly use a Localchain account to pay for queries, as shown below. In this example, a Datastore with a `domain` of `Meals.Health` is queried for all recipes that are `paleo`. Version `0.0.1` of the Datastore is used.

This payment services is using all default settings, which will use the `primary` Localchain on the machine installed into the default location. It will attempt to create [Channel Holds](../basics/payments.md#micropayment-channelholds) for 100 queries at a time - if the price is 1 milligon per query, this will load 100 milligons into the Channel Hold. You can choose different "Channel Hold" strategies by passing in a different `channelHoldAllocationStrategy` object.

```typescript
import { Client, DefaultPaymentService } from '@ulixee/client';

(async () => {
  const client = new Client(`ulx://Meals.Health/v0.0.1`, {
    paymentService: await DefaultPaymentService.fromLocalchain(),
  });
  const results = await client.query(
    `SELECT * from recipes where diet = 'paleo`,
  );

  console.log(results);

  await client.disconnect();
})().catch(console.error);
```

### Acquire Testnet Argons

If you want to test out a Datastore using the Argon testnet, you can request them using the Discord Faucet. Find directions [here](https://github.com/argonprotocol/mainchain/blob/main/docs/account-setup.md#requesting-testnet-funds). 

## Using the Testnet Databroker

> Under construction.

An easier way to query Datastores is to use the Ulixee Foundation's Databroker. The Databroker allows you to run queries against any Datastore on the Testnet without needing to manage a Localchain account. The Databroker will automatically pay for your queries using the Ulixee Foundation's Localchain account. You'll need to register on the Databroker Admin Panel to get an API key (see next step).

```typescript
import { Client, DefaultPaymentService } from '@ulixee/client';

(async () => {
  const client = new Client(`ulx://Meals.Health/v0.0.1`, {
    paymentService: await DefaultPaymentService.fromBroker(
      'wss://databroker.testnet.ulixee.org',
      {
        pemPath: 'path to your Identity pem file',
      },
    ),
  });
  const results = await client.query(
    `SELECT * from recipes where diet = 'paleo`,
  );

  console.log(results);

  await client.disconnect();
})().catch(console.error);
```

### Register on the Databroker Admin Panel

Normally, the admin panel for a Databroker is locked down to the owner of the Datastore. However, the Ulixee Foundation has opened up the Databroker for the Testnet to allow anyone to register and run queries. You can register for the Databroker [here](https://databroker.testnet.ulixee.org:18171/admin).

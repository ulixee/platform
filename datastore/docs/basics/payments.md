# Datastore Payments

Ulixee Datastores accept two forms of micropayments out of the box: Argons and a Credit system. A Payment Service allows you to customize how payments are allocated for your queries.

You can create your own payment service by implementing the [IPaymentService](https://github.com/ulixee/platform/tree/main/datastore/main/interfaces/IPaymentService.ts) interface.

## Concepts

### Denominations

Argon Payments come in the following denominations:

- _Argon_: ~1 USD adjusted for inflation.
- _Milligon_: ~1 thousand of a USD adjusted for inflation (about $0.001).
- _Microgon_: ~1 millionth of a USD adjusted for inflation (about $0.000,001). This is the denomination used by a query (eg, [Extractor.basePrice](./extractor.md#constructor).

### Micropayment ChannelHolds

A micropayment ChannelHold is a temporary hold on a Localchain that reserves a set amount of Argons (let's say, 10 Argon). When a user sets aside funds in their Localchain for a ChannelHold, their account cannot be modified for 1 hour (in Argon, these are 60 "ticks" representing an agreed upon minute of clock time).

The smallest unit in Argon is a milligon, which is 1/1000th of an Argon. But in Ulixee Micropayments, payments are allowed to go as low as a microgon, which is 1/1,000,000th of an Argon. This allows for a price per query model to work with huge volumes, while still keeping the cost per query reasonable.

During the hour, the ChannelHold sender and Datastore can exchange data for payment. There is no way to break the agreement early. Every time another milligon is spent (1/1000th of an argon), the Datastore will require an updated "settlement" indicating 1 more milligon is authorized for payment. This way, at all times, the Datastore is assured that the 10 Argons are legitimate, and the user knows the Datastore can only claim the funds that have been authorized.

After the hour is up, the recipient of the funds (the datastore) submits the signed settlement to a notary and moves those funds to their Localchain.

The Datastore and User were able to exchange data for payment with volumes only limited by each other's machines and network connections. Only the beginning and final settlement need to be sent to the broader Argon network. This allows Ulixee to achieve a high volume of micropayments without overwhelming the Argon network.

### Credits

Datastores come built-in with a credits model. This is a little like a free trial mode if you want to hand out data credits to people trying out your Datastore. Credits are not a payment method, but a way to allocate free queries. A payment service will keep track of how many credits are available and prioritize them before charging for Argons.

## Payment Services

Payment services are used by [Clients](/docs/client) and Datastores to manage payments. They can be used to allocate Argons, manage credits, and track payments.

### DefaultPaymentService

The [default payment service](https://github.com/ulixee/platform/blob/42bc301bb24f1697ea60bca2db9258fe469e0212/datastore/main/payments/DefaultPaymentService.ts#L25) combines an Argon payment service with a Credit payment service. Argon payments can come from a Localchain on the same computer, a [Data broker](./databrokers) or a Remote Service.

You will interact with this class in two primary ways:

#### 1. With a Localchain

If you are running a Localchain on the same computer, you can use the `fromLocalchain` method to create a payment service that will automatically allocate Argons from the Localchain.

```typescript
import {
  DefaultPaymentService,
  IChannelHoldAllocationStrategy,
  LocalchainWithSync,
} from '@ulixee/datastore';

// This strategy will create batches of 200 queries worth of argons per ChannelHold (1 hour).
const channelHoldAllocationStrategy: IChannelHoldAllocationStrategy = {
  type: 'multiplier',
  queries: 200,
};
const bobchain = await LocalchainWithSync.load({
  localchainName: 'bobchain',
  channelHoldAllocationStrategy,
});
const paymentService = DefaultPaymentService.fromLocalchain(bobchain);
```

#### 2. With a Data Broker

A [Databroker](./databrokers) is a service that manages Argons for you. You can use the `fromBroker` method to create a payment service that will automatically allocate Argons from the Data Broker.

```typescript
import { DefaultPaymentService, IChannelHoldAllocationStrategy } from '@ulixee/datastore';

// This strategy will create batches of 200 queries worth of argons per channelHold (1 hour).
const channelHoldAllocationStrategy: IChannelHoldAllocationStrategy = {
  type: 'multiplier',
  queries: 200,
};
const paymentService = await DefaultPaymentService.fromBroker(
  'wss://broker.testnet.ulixee.org',
  {
    pemPath: 'path to your Identity pem file',
  },
  channelHoldAllocationStrategy,
);
```

### EmbeddedPaymentService

When you [Clone](./cloning) a Datastore that requires payment, your CloudNode needs to establish Micropayment Channels with any upstream datastore(s). The embedded payment service works with a local (or cluster) Localchain to establish payments with limited permissions. This service will automatically only whitelist the upstream Datastore sources and Datastore IDs listed in the cloned Datastore.

To enable the EmbeddedPaymentService, you either need to have a configured Localchain on the same machine, or you'll need to configure a Hosted Service to manage the Localchain for you.

Configure a Localchain with the [`Localchain` configurations](http://localhost:8080/docs/datastore/overview/configuration#payment-configuration), or if you're setting up a CloudNode in a cluster, you would set the `ULX_UPSTREAM_PAYMENTS_SERVICE_HOST` environment variable, pointing to your Hosted Services node. (NOTE: you can also just configure your child with the `ULX_SERVICES_SETUP_HOST` environment variable set to your Hosted Services node).

Lead node:

```bash
$ npx @ulixee/cloud start --hosted-services-port 18181 \
    --argon-localchain-path /path/to/localchain \
    --argon-mainchain-url wss://rpc.testnet.argonprotocol.org \
    --argon-block-rewards-address 5DRTmdnaztvtdZ56QbEmHM8rqUR2KiKh7KY1AeMfyvkPSb5S
```

Child node:

```bash
$ npx @ulixee/cloud start --setup-host <host ip>:18181
```

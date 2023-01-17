# Credits

> Credits allow you to grant free trial credits to your users on a metered access level. They can be seamlessly replaced with real payments when they're exhausted.

Datastores automatically build-in a table (`ulx_credits`) to grant metered access Credits to your users.

### Embedding

When you clone a Datastore, you can embed Credits you've been issued by an upstream Datastore. This enables you to issue Credits to your own users.

To embed credits, you can configure the [remoteDatastoreEmbeddedCredits](../basics/datastore.md#constructor) parameter on your Datastore.

## Denominations

Ulixee Payments (in this case, Credits) come in the following denominations:

- _Argon_: ~1 USD adjusted for inflation.
- _Centagon_: ~1 hundredth of a USD adjusted for inflation. Usually the denomination used when creating a Credit.
- _Microgon_: ~1 millionth of a USD adjusted for inflation. This is the denomination used by a query (eg, [Function.pricePerQuery](../basics/function.md).

### Payment Flows and Internal Structure

Table `ulx_credits`

- id `string`. An id starting with `cred` and 8 digits.
- salt `string`. A unique salt value used to add entropy to the `secretHash`
- secretHash `string`. A sha3 hash of the `id`, `salt` and `secret`.
- issuedCredits `number`. Initial credits granted (in [Microgon](#denominations) denomination).
- remainingCredits `number`. The credits remaining without accounting for credits on hold (in [Microgon](#denominations) denomination).
- holdCredits `number`. Credits placed on hold during Query/Stream processing (in [Microgon](#denominations) denomination).

The `ulx_credits` table tracks every credit id to the balance of credits "on hold" and "remaining". During processing, `holdCredits` will reserve the minimum number of Microgons needed to fulfill the query. After completion of the query, the `holdCredits` field will be updated with the held amount removed, and the remainingCredits decremented by the final total.

### Admin Identity Access {#admin}

To use Credits, you need to have a valid `admin` Identity installed on either the Datastore or your [Miner](../overview/configuration.md).

An identity is an Ed25519 key with a recognized encoding for the Ulixee Platform. To create a new Identity, you can run: `npx @ulixee/crypto identity`. Run with `-h` to get options on how to store the resulting PEM file.

## Command Line Interface (CLI) {#cli}

### Create

To create a Credit, you must first [deploy](../overview/deployment.md) your Datastore.

```bash
 npx @ulixee/datastore credits create <datastore url>
```

... or via Ulixee CLI:

```bash
 ulixee datastore credits create <datastore url>
```

You must provide a `datastore url` to your deployed Datastore. You must also provide a path to a valid [Admin Identity](#admin), and an `amount`.

The output value will include a `secret` that you should provide to the recipient. The `secret` is intended to make it challenging for a Credit to be used by another user. However, it should not be considered a secure password.

#### CLI Options

Options below show a short and long form.

- `-m, --amount <value>` The value of this Credit. Amount can postfix "c" for centagons (eg, 50c) or "m" for microgons (5000000m).
- `-i, --identity-path <path>` A path to an Admin Identity. Necessary for actions restricting access to Admins of a Datastore. (env: ULX_IDENTITY_PATH)
- `-p, --identity-passphrase <path>` A decryption passphrase to the Ulixee Admin Identity (only necessary if specified during key creation). (env: ULX_IDENTITY_PASSPHRASE)

### Get Balance

To create a Credit, you must first [deploy](../overview/deployment.md) your Datastore.

```bash
 npx @ulixee/datastore credits get <datastore url> <credit id>
```

... or via Ulixee CLI:

```bash
 ulixee datastore credits get <datastore url> <credit id>
```

You must provide a `datastore url` to your deployed Datastore and the <credit id>. This cli command can be called without authentication.

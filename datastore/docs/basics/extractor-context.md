# ExtractorContext

> ExtractorContext provides access to metadata about your Extractor execution, along with Plugin-created variables.

The ExtractorContext class is passed into the [`run`](./extractor#constructor) callback provided to a Extractor. It cannot be constructed.

## Properties

### authentication {#authentication}

An optional object passed to call the function. It's provided here to pass on to remote function calls that might be made from the function.

Authentication includes:

- identity `string`. A bech32 encoded Identity of the caller.
- signature `Buffer`. An ed25519 signature providing proof of the Identity private key. The signature message is the concatenation of: `Datastore.exec`, any `Credits Id`, any `Micronote Id`, and a unique `nonce`
- nonce `string`. A unique nonce code. This nonce can be used for additional "unique" calls validation if desired.

### callerAffiliateId

The affiliateId provided (if any) to this Extractor call.

#### **Returns** `string`.

### datastoreAffiliateId

The affiliateId of the containing Datastore.

#### **Returns** `string`.

### datastoreMetadata

Metadata about all [Extractors](./extractor.md), [Crawlers](./crawler.md) and [Tables](./table.md) installed in this Datastore.

#### **Returns** 'IDatastoreMetadata'

### input

Readonly input.

#### **Returns** [`Input`](./input.md)

### Output

Output class. Can be constructed into a new Output instance, or can use the static `emit()` function to emit Output directly.

#### **Returns** [`Output`](./output.md)

### outputs

List of outputs created during the given run.

#### **Returns** Array of created [`Output`](./output.md) objects.

### payment

The payment supplied to the Datastore Core for payment. Top level keys are:

- micronote `IMicronote`. A micronote created by a valid Argon Localchain.
- credits `{ id, secret }`. A credits object to use, issued by the Datastore.

### schema

A schema defining inputs and outputs for the function.

#### **Returns** [`IExtractorSchema`](../advanced/extractor-schemas.md)

## Methods

### crawl _(crawler, options)_ {#crawl}

Execute the [`crawler`](./crawler.md) and return the resulting metadata. Arguments are the `input` parameters defined in the schema.

#### **Arguments**:

- crawler [`Crawler`](./crawler.md) The Crawler instance to run.
- options `object`. Parameters to run the crawler. This parameter will default all values to the context. eg, the payment, authentication and affiliateId of the caller will be defaulted to the values provided to the original function this ExtractorContext has been passed into.

  - authentication [authentication](#authentication). Override the authentication supplied to the calling context.
  - input [input](#input). Merge values into the calling input. If you are calling a Crawler from a Extractor, and you supply only a `maxTimeInCache` value, it will be _added_ to the input values provided to the Extractor.
  - affiliateId `string`. Override the affiliateId provided to the calling function.

#### Return Promise<ICrawlerOutputSchema>. Returns a promise of the Crawler output (version, sessionId and crawler).

### fetch _(extractorOrTable, options)_ {#fetch}

Alias for [`run`](#run). This function executes and returns results for a query.


#### Return Promise/AsyncIterable of schema['Output'] Returns an AsyncIterable streaming results one at a time, or a Promise waiting for all results. The objects are the defined Schema Output records.

### query _(sql, boundValues)_ {#query}

Queries the Datastore with the given sql and bound values. Uses PostgresSQL query syntax. Currently supports $1, $2, $3 parameter syntax.

#### Return Promise<TSqlSelect[]> Return a promise of records matching the schema types of the selected columns.  

### run _(function, options)_ {#run}

Execute the passed in function. The result is an AsyncIterable, which can be used to get each Output record as it is emitted. Alternatively, if you await the result, it will wait for the process to complete and return all Output records as an array. Parameter options are the `input` schema, or any values if none is defined.

#### **Arguments**:

- function [`Extractor`](./extractor.md) The Extractor instance to run.
- options `object`. Parameters to run the crawler. This parameter will default all values to the context. eg, the payment, authentication and affiliateId of the caller will be defaulted to the values provided to the original function this ExtractorContext has been passed into.
    - payment `IPayment`. Override the payment provided to this context.
    - authentication [authentication](#authentication). Override the authentication supplied to the calling context.
    - input [input](#input). Merge values into the calling input. If you are calling a Crawler from a Extractor, and you supply only a `maxTimeInCache` value, it will be _added_ to the input values provided to the Extractor.
    - affiliateId `string`. Override the affiliateId provided to the calling function.

#### Return Promise/AsyncIterable of schema['Output'] Returns an AsyncIterable streaming results one at a time, or a Promise waiting for all results. The objects are the defined Schema Output records.

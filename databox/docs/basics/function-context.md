# FunctionContext

> FunctionContext provides access to metadata about your Function execution, along with Plugin-created variables.

The FunctionContext class is passed into the [`run`](./function#constructor), [`beforeRun`](./function#constructor) and [`afterRun`](./function#constructor) callbacks provided to a Function. It cannot be constructed.

## Properties

### authentication

An optional object passed to call the function. It's provided here to pass on to remote function calls that might be made from the function.

Authentication includes:

- identity `string`. A bech32 encoded Identity of the caller.
- signature `Buffer`. An ed25519 signature providing proof of the Identity private key. The signature message is the concatenation of: `Databox.exec`, any `GiftCard Id`, any `Micronote Id`, and a unique `nonce`
- nonce `string`. A unique nonce code. This nonce can be used for additional "unique" calls validation if desired.

### input

Readonly input.

#### **Returns** [`Input`](./input.md)

### output

Get or set the output data.

#### **Returns** [`Output`](./output.md)

### payment

The payment supplied to the Databox Core for payment. Top level keys are:

- micronote `IMicronote`. A micronote created by a valid Sidechain.
- giftCard `GiftCard`. A gift card issued by the Databox author or Core server.

### schema

A schema defining inputs and outputs for the function.

#### **Returns** [`IFunctionSchema`](../advanced/function-schemas.md)

## Methods

No public methods.

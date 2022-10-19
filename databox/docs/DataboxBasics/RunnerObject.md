# RunnerObject

> RunnerObject provides access to metadata about your Databox execution, along with a pre-initialized Hero instance.

The RunnerObject class is passed into the [`run`](/docs/databox/basic-client/databox#constructor) function provided to a Databox. It cannot be constructed.

## Properties

### action

Readonly action. Not currently in use. Relates to multi-purpose scripts.

#### **Returns** `string`.

### input

Readonly input.

#### **Returns** [`Input`](/docs/databox/databox-basics/input)

### output

Get or set the output data.

#### **Returns** [`Output`](/docs/databox/databox-basics/output)

### sessionId

Readonly unique sessionId for this Session.

#### **Returns** `Promise<string>`

## Methods

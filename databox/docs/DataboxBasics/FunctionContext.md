# FunctionContext

> FunctionContext provides access to metadata about your Function execution, along with Plugin-created variables.

The FunctionContext class is passed into the [`run`](/docs/databox/basic-client/function#constructor), [`beforeRun`](/docs/databox/basic-client/function#constructor) and [`afterRun`](/docs/databox/basic-client/function#constructor) callbacks provided to a Function. It cannot be constructed.

## Properties

### input

Readonly input.

#### **Returns** [`Input`](/docs/databox/databox-basics/input)

### output

Get or set the output data.

#### **Returns** [`Output`](/docs/databox/databox-basics/output)

### schema

A schema defining inputs and outputs for the function.

#### **Returns** [`IFunctionSchema`](/docs/databox/databox-advanced/function-schema)

## Methods

No public methods.

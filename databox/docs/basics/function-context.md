# FunctionContext

> FunctionContext provides access to metadata about your Function execution, along with Plugin-created variables.

The FunctionContext class is passed into the [`run`](./function#constructor), [`beforeRun`](./function#constructor) and [`afterRun`](./function#constructor) callbacks provided to a Function. It cannot be constructed.

## Properties

### input

Readonly input.

#### **Returns** [`Input`](./input.md)

### output

Get or set the output data.

#### **Returns** [`Output`](./output.md)

### schema

A schema defining inputs and outputs for the function.

#### **Returns** [`IFunctionSchema`](../advanced/function-schemas.md)

## Methods

No public methods.

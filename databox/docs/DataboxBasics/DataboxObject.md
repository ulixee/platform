# DataboxObject

> DataboxObject provides access to metadata about your execution's input and output environment.

A pre-initialized DataboxObject instance is passed into the [`run`](/docs/databox/databox-basics/databox#constructor) callback. It cannot be constructed.

```js
export default new Databox(databoxObject => {
  // databox code
})
```

In almost all our example code we simplify it down to just `databox`:
```js
export default new Databox(databox => {
  // databox code
})
```

## Properties

### databoxObject.input

Readonly input. See [InputObject](/docs/databox/databox-basics/input).

#### **Returns** [`InputObject`](/docs/databox/databox-basics/input)

### databoxObject.output

Get or set the output data. See [`OutputObject`](/docs/databox/databox-basics/output).

#### **Returns** [`OutputObject`](/docs/databox/databox-basics/output)

## Methods

There are no public methods on this instance.

# Runner

> Runner provides access to metadata about your Databox execution, along with a pre-initialized Hero instance.

The Runner class is passed into the [`run`](/docs/databox/basic-client/databox#constructor) function provided to a Databox. It cannot be constructed.

## Properties

### action

Readonly action. Not currently in use. Relates to multi-purpose scripts.

#### **Returns** `string`.

### hero

Readonly access to a pre-initialize [Hero](/docs/hero) instance.

#### **Returns** [`Hero`](/docs/hero)

### input

Readonly input.

#### **Returns** [`Input`](/docs/databox/basic-client/input)

### output

Get or set the output data.

#### **Returns** [`Output`](/docs/databox/basic-client/output)

### sessionId

Readonly unique sessionId for this Session.

#### **Returns** `Promise<string>`

## Methods

### runner.extractLater *(name, value)* {#extract-later}

Collect a snippet. It can be any data from your script, whether transformed or collected.

```js
import Databox from '@ulixee/databox-for-hero-playground';

export default new Databox({
  async run({ hero, extractLater }) {
    await hero.goto('https://ulixee.org');
    await extractLater('time', new Date());
  },
  async extract({ collectedSnippets }) {
    const when = await collectedSnippets.get('time');
  },
});
```

#### **Arguments**:

- name `string`. The name of the key to store this snippet under.
- value `string | number | object | array | boolean`. The value to store.

#### **Returns**: `Promise<void>`

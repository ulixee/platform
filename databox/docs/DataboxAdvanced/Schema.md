# Schema

> The Schema module provides a combination of Typescript typing, Documentation, and Runtime validation for types.

Schemas are generally created via the exported methods from the `@ulixee/schema` module.

```js
import { object, boolean, string, number } from '@ulixee/schema';

const record = object({
  isValid: boolean({ description: 'Whether this record can be correctly serialized' }),
  valueInEnglish: string(),
  countOfChars: number({ integer: true }),
});

const result = record.validate({
  isValid: true,
  valueInEnglish: 1n,
  countOfChars: 0,
});

result.success; // false
result.errors; // ValidationError list
```

## Methods

### boolean(config): `BooleanSchema` {#boolean}

Creates a runtime `boolean` schema. NOTE: you almost always add this as a key of an [`ObjectSchema`](#object).

#### **Arguments**:

Arguments is an optional object containing the following properties:

- optional: `boolean`. Field to set to true of the boolean is an optional field.
- description: `string`. Optional description of this field to add to documentation and runtime types.

### number(config): `NumberSchema` {#number}

Creates a runtime `number` schema. NOTE: you almost always add this as a key of an [`ObjectSchema`](#object). Numbers can be any integer, decimal or float fitting into a NodeJs number type.

#### **Arguments**:

Arguments is an optional object containing the following properties:

- min: `number`. Minimum value this field allows.
- max: `number`. Maximum value this field allows.
- decimals: `number`. Optional number of decimal points this number will contain.
- integer: `boolean`. True if this schema constrained to whole numbers.
- optional: `boolean`. Field to set to true of the boolean is an optional field.
- description: `string`. Optional description of this field to add to documentation and runtime types.

### string(config): `StringSchema` {#string}

Creates a runtime `string` schema. NOTE: you almost always add this as a key of an [`ObjectSchema`](#object).

#### **Arguments**:

Arguments is an optional object containing the following properties:

- format: `string of 'email' | 'url' | 'date' | 'time'`. An optional format for values to adhere to.
  - email and url follow W3C specifications.
  - date is 'YYYY-MM-DD' format (Year-Month-Day)
  - time is 'HH:mm' format (24 Hour-Minute)
- regexp: `RegExp`. Optional regular expression defining a custom pattern.
- enum: `string[]`. Optional list of allowed string values.
- minLength: `number`. Optional minimum length this string can be.
- maxLength: `number`. Optional maximum length this string can be.
- length: `number`. Optional required length of the string.
- optional: `boolean`. Field to set to true of the boolean is an optional field.
- description: `string`. Optional description of this field to add to documentation and runtime types.

### bigint(config): `BigintSchema` {#bigint}

Creates a runtime `bigint` schema. NOTE: you almost always add this as a key of an [`ObjectSchema`](#object).

Arguments is an optional object containing the following properties:

- min: `bigint`. Minimum value this field allows.
- max: `bigint`. Maximum value this field allows.
- optional: `boolean`. Field to set to true of the boolean is an optional field.
- description: `string`. Optional description of this field to add to documentation and runtime types.

### buffer(config): `BufferSchema` {#buffer}

Creates a runtime `Buffer` schema. NOTE: you almost always add this as a key of an [`ObjectSchema`](#object).

Arguments is an optional object containing the following properties:

- encoding: `string`. Optional encoding this buffer will be encoded with. One of `ascii, utf8 utf16le, ucs2, base64, latin1, binary, hex`
- optional: `boolean`. Field to set to true of the boolean is an optional field.
- description: `string`. Optional description of this field to add to documentation and runtime types.

### date(config): `DateSchema` {#date}

Creates a runtime `Date` schema, validating this object is a Date. NOTE: you almost always add this as a key of an [`ObjectSchema`](#object).

Arguments is an optional object containing the following properties:

- future: `boolean`. Optional boolean indicating if this value will be in the future at time of run.
- past: `boolean`. Optional boolean indicating if this value will be in the past at time of run.
- optional: `boolean`. Field to set to true of the boolean is an optional field.
- description: `string`. Optional description of this field to add to documentation and runtime types.

### record(config): `RecordSchema` {#record}

Creates a runtime `Record` schema of unrestricted string keys mapped to a type of Schema value. You must provide the Schema type of the record values.

Arguments is an object containing the following properties:

- values: `Any Schema`. A required definition for the values of this schema
- keys: `StringSchema`. Optional StringSchema defining the key restrictions for this record.
- optional: `boolean`. Field to set to true of the boolean is an optional field.
- description: `string`. Optional description of this field to add to documentation and runtime types.

```js
import { record, string, number } from '@ulixee/schema';

const schema = record({
  keys: string({ length: 10 }),
  values: number({ description: 'Every key is a number' }),
});

schema.validate({
  '0123456789': 1,
  '1234567890': 2,
  '2345678901': 3,
}); // VALID!
```

### object(config): `ObjectSchema` {#object}

Creates a runtime `Object` schema of specific keys mapped to types of values.

The default argument structure for `object` takes the following properties:

- fields: `Record<string, Any Schema>`. A required object defining all keys mapped to the Schema of each accompanying value.
- optional: `boolean`. Field to set to true of the boolean is an optional field.
- description: `string`. Optional description of this field to add to documentation and runtime types.

```js
import { object, string, number } from '@ulixee/schema';

const schema = object({
  description: 'Documentation that will be added to jsdocs',
  fields: {
    field1: string(),
    field2: number(),
  },
});

schema.validate({
  field1: 'test',
  field2: 1,
}); // VALID!

schema.validate({
  field1: 'test',
  field2: '1',
}); // INVALID!
```

If you are not providing a description or optional value, you can shorten a definition to directly supply the `fields`.

```js
import { object, string, number } from '@ulixee/schema';

const schema = object({
  field1: string(),
  field2: number(),
});
```

### array(config): `ArraySchema` {#array}

Creates a runtime `Array` schema of any type of Schema ([object](#object), [string](#string), [number](#number), etc).

The default argument structure for `array` takes the following properties:

- element: `Any Schema`. The type of Schema for the array elements.
- optional: `boolean`. Field to set to true of the boolean is an optional field.
- description: `string`. Optional description of this field to add to documentation and runtime types.

```js
import { array, number } from '@ulixee/schema';

const schema = array({
  element: number(),
});

schema.validate([1, 2, 3]); // VALID!
schema.validate([1, 2, '3']); // INVALID!
```

If you are not providing a description or optional value, you can shorten a definition to directly supply the `element`.

```js
import { array, number } from '@ulixee/schema';

const schema = array(number());
```

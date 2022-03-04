# Input

Input is a field to contain your arguments for a Databox script. It allows you to group all the input parameters under a single variable.

Command line variables are parsed using [yargs-parser](https://github.com/yargs/yargs-parser). Variables containing a '.' will be converted into objects, and dashes are camel-cased.

```shell
  node ./script.js --input.foo=99 --input.bar=9987930
```

```js
import Databox from '@ulixee/databox';

export default new Databox(databox => {
  const { input } = databox;
  const foo = input.foo; //99
  const bar = input.bar; //9987930
});
```

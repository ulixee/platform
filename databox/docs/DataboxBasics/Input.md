# Input

Every databox accepts input, which it then passes into the `run` and `extract` callbacks.

When running the Databox as a NodeJs script from the command line, you can pass the input as CLI variables. These are parsed using [yargs-parser](https://github.com/yargs/yargs-parser). Variables containing a '.' will be converted into objects, and dashes are camel-cased.

```shell
  node ./script.js --input.foo=99 --input.bar=9987930
```

```js
import Databox from '@ulixee/databox-for-hero-playground';

export default new Databox(databox => {
  const { input } = databox;
  const foo = input.foo; //99
  const bar = input.bar; //9987930
});
```

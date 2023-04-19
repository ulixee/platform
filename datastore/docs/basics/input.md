# Input

Every Extractor accepts input, which is attached to the [ExtractorContext](./extractor-context.md).

When running the Extractor as a NodeJs script from the command line, you can pass the input as CLI variables. These are parsed using [yargs-parser](https://github.com/yargs/yargs-parser). Variables containing a '.' will be converted into objects, and dashes are camel-cased.

```shell
  node ./script.js --input.foo=99 --input.bar=9987930
```

```js
import { Extractor, HeroExtractorPlugin } from '@ulixee/datastore-plugins-hero';

export default new Extractor(context => {
  const { input, Hero } = context;
  const foo = input.foo; //99
  const bar = input.bar; //9987930
}, HeroExtractorPlugin);
```

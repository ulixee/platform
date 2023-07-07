# Input

Every Extractor accepts input, which is attached to the [ExtractorContext](./extractor-context.md).

```js
import { Extractor, HeroExtractorPlugin } from '@ulixee/datastore-plugins-hero';

export default new Extractor(context => {
  const { input, Hero } = context;
  const foo = input.foo; //99
  const bar = input.bar; //9987930
}, HeroExtractorPlugin);
```

# Input

Every Function accepts input, which is attached to the [FunctionContext](/docs/databox/basics/function-context).

When running the Function as a NodeJs script from the command line, you can pass the input as CLI variables. These are parsed using [yargs-parser](https://github.com/yargs/yargs-parser). Variables containing a '.' will be converted into objects, and dashes are camel-cased.

```shell
  node ./script.js --input.foo=99 --input.bar=9987930
```

```js
import { Function, HeroFunctionPlugin } from '@ulixee/databox-plugins-hero';

export default new Function(context => {
  const { input, hero } = context;
  const foo = input.foo; //99
  const bar = input.bar; //9987930
}, HeroFunctionPlugin);
```

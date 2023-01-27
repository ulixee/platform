# Input

Every Runner accepts input, which is attached to the [RunnerContext](./function-context.md).

When running the Runner as a NodeJs script from the command line, you can pass the input as CLI variables. These are parsed using [yargs-parser](https://github.com/yargs/yargs-parser). Variables containing a '.' will be converted into objects, and dashes are camel-cased.

```shell
  node ./script.js --input.foo=99 --input.bar=9987930
```

```js
import { Runner, HeroRunnerPlugin } from '@ulixee/datastore-plugins-hero';

export default new Runner(context => {
  const { input, Hero } = context;
  const foo = input.foo; //99
  const bar = input.bar; //9987930
}, HeroRunnerPlugin);
```

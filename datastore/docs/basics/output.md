# Output

Output is an object used to create a "result" for your Datastore Function.

It's a specialized object because it allows Datastore to observe an object that you attach to the output. All changes will be recorded as you modify the object. You can optionally `emit()` an Output instance, which will stream the individual record to any callers.

If you do not manually call `emit()`, all created Output instances will be emitted when the `Function.run` callback completes.

```js
import { Function, HeroFunctionPlugin } from '@ulixee/datastore-plugins-hero';

const func = new Function(async ctx => {
  const { Output, Hero } = ctx;

  const links = [
    { name: 'Google', href: 'https://www.google.com' },
    { name: 'Hacker News', href: 'https://news.ycombinator.com' },
  ];

  const hero = new Hero();

  for (const page of links) {
    await hero.goto(page.href);

    for (const link of await hero.querySelectorAll('a')) {
      const output = new Output({
        // will be added to the output array
        id: (await link.name).replace(/[^a-z]+/g, '-'),
        href: await link.href,
      });
      output.emit();
    }
  }
}, HeroFunctionPlugin);

(async () => {
  // Records can be consumed as they are emitted
  for await (const output of func.stream()) {
    console.log(output, new Date());
  }
})();
```

## Methods

### emit _()_ {#emit}

Instance method to freeze the output and immediately emit the record to any callers.

### Output.emit*()*

Static method to emit contents without constructing a new Output record.

```js
import { Function } from '@ulixee/datastore';

new Function(async context => {
  const { input, Output, Hero } = context;
  const hero = new Hero();
  await hero.goto('https://example.org');
  Output.emit({ text: `I went to example.org. Your input was: ${input.name}` });
}, HeroFunctionPlugin);
```

## Gotchas

### Assigning Variables in Bulk

You cannot "re-assign" the output variable and have it be observed. You should instead use `Object.assign(output, yourVariables)` to assign them onto the output object, or set properties individually.

```js
import { Function } from '@ulixee/datastore';

export default new Function(async ctx => {
  let { Output } = ctx;

  let output = new Output();

  // Setting a variable is ok
  output.whoop = 'This will work!';

  // Datastore will not record this change
  output = { whoops: 'This will not work!' };
});
```

### Observable

Any object you assign into Output is "copied" into the Output object. To create an object that will be tracked through the process of attaching it to output, you can use the `Observable` class.

```js
import { Observable, Function } from '@ulixee/datastore';

export default new Function(async ctx => {
  const { Output } = ctx;

  let result = Observable({});
  const output = new Output({ results: [] });
  output.results.push(result);

  result.text = 'Got it!';
});
```

If you do not use `Observable` or re-retrieve your object, you should NOT expect further changes to the source object to be saved.

```js
import { Function } from '@ulixee/datastore';

export default new Function(async ctx => {
  const { Output } = datastore;

  let result = {};
  const output = new Output({ result });

  result.text = 'Not going to be there!'; // WILL NOT TRACK!
});
```

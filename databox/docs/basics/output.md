# Output

Output is an object used to create a "result" for your Databox Function.

It's a specialized object because it allows Databox to observe an object that you attach to the output. All changes will be recorded as you modify the object without any additional work.

Output is able to act like an Array or an Object. It will serialize properly in either use-case.

```js
import { Function, HeroFunctionPlugin } from '@ulixee/databox-plugins-hero';

export default new Function(async ctx => {
  const { output, hero } = ctx;

  const links = [
    { name: 'Google', href: 'https://www.google.com' },
    { name: 'Hacker News', href: 'https://news.ycombinator.com' },
  ];

  for (const link of await hero.querySelectorAll('a')) {
    output.push({
      // will be added to the output array
      id: (await link.name).replace(/[^a-z]+/g, '-'),
      href: await link.href,
    });
  }
}, HeroFunctionPlugin);
```

NOTE: you cannot "re-assign" the output variable and have it be observed. You should instead use `Object.assign(output, yourVariables)` to assign them onto the output object, or set properties individually.

```js
import { Function } from '@ulixee/databox';

export default new Function(async ctx => {
  let { output } = ctx;

  // Setting a variable is ok
  output.whoop = 'This will work!';

  // Databox will not record this change
  output = { whoops: 'This will not work!' };
});
```

### Observable

Any object you assign into Output is "copied" into the Output object. To create an object that will be tracked through the process of attaching it to output, you can use the `Observable` class.

```js
import { Observable, Function } from '@ulixee/databox';

export default new Function(async ctx => {
  const { output } = ctx;

  let result = Observable({});
  output.push(result);

  result.text = 'Got it!';
});
```

If you do not use `Observable` or re-retrieve your object, you should NOT expect further changes to the source object to be saved.

```js
import { Function } from '@ulixee/databox';

export default new Function(async ctx => {
  const { output } = databox;

  let result = {};
  output.push(result);

  result.text = 'Not going to be there!'; // WILL NOT TRACK!
});
```
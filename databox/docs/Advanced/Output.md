# Output

Databox output is an object used to create a "result" for your Databox function.

It's a specialized object because it allows Databox to observe an object that you attach to the output. All changes will be recorded as you modify the object without any additional work.

Output is able to act like an Array or an Object. It will serialize properly in either use-case.

```js
import Databox from '@ulixee/databox-for-hero';

export default new Databox(async databox => {
  const { output, hero } = databox;
  await hero.goto('https://www.google.com');

  for (const link of await hero.querySelectorAll('a')) {
    output.push({
      // will be added to the output array
      text: await link.textContent,
      href: await link.href,
    });
  }
});
```

NOTE: you cannot "re-assign" the output variable and have it be observed. You should instead use `Object.assign(output, yourVariables)` to assign them onto the output object, or set properties individually.

```js
import Databox from '@ulixee/databox-for-hero';

export default new Databox(async databox => {
  const { output, hero } = databox;
  await hero.goto('https://www.google.com');
  
  // Setting a variable is ok
  output.whoop = 'This will work!';
  
  // Databox will not record this change
  output = { whoops: 'This will not work!' };
});
```

### Observable

Any object you assign into Output is "copied" into the Output object. To create an object that will be tracked through the process of attaching it to output, you can use the `Observable` class.

```js
import Databox, { Observable } from '@ulixee/databox-for-hero';

export default new Databox(async databox => {
  const { output, hero } = databox;
  await hero.goto('https://www.google.com');

  let result = Observable({});
  output.push(result);

  result.text = 'Got it!';
});
```

If you do not use `Observable` or re-retrieve your object, you should NOT expect further changes to the source object to be saved.

```js
import Databox from '@ulixee/databox-for-hero';

export default new Databox(async databox => {
  const { output, hero } = databox;
  await hero.goto('https://www.google.com');

  let result = {};
  output.push(result);

  result.text = 'Not going to be there!'; // WILL NOT TRACK!
});
```

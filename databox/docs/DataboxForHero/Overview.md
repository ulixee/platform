# Databox for Hero

Databoxes allow you further break down your script into a "run" section and an "extract" section. 

The 'run' step can be used with [Hero](/docs/hero) to interact with a website and collect assets like [Resources](/docs/databox/advanced-client/collected-resources), [HTML Fragments](/docs/databox/advanced-client/collected-fragmes) and [Data Snippets](/docs/databox/advanced-client/collected-snippets) that can be extracted later. 

The 'extract' function is passed in collected assets, but no Hero. You can use this function to pull out data from a synchronous set of assets (ie, you don't have to run your logic browser-side). It also allows you to run your extraction logic as a unit, which enables you to keep running it on assets collected from your last `run` until your logic works correctly. 

Getting Started

Writing a Databox is very similar to writing a normal Hero script, except it must be contained within a callback, and you have make it the default export.

You can run this script as a regular node script and it will run the callback. However, this structure also allows us to load it into a server (Miner) and run it on demand.

```js
export default new Databox(async databox => {
  const { input, output, hero } = databox;

  await hero.goto(input.url);
  const title = await hero.document.title;

  output.title = title;
  output.body = await hero.document.body.textContent;
  await hero.close();
});
```


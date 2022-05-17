# Introduction

> Databoxes are a simple, yet powerful structure to write your scripts so they can be dynamically configured, tested a thousand ways and provide a unit to your data extraction efforts 

## Why Create a Structure?

By creating a boundary around a single "scrape", scripts are far easier to test, re-try, scale and compose. It allows us to do things like:
- Restart a script during development as you change it.
- Rotate inputs to try out a variety of IPs, parameters, and more to make sure you can handle edge cases.
- Test the extraction of 100s of different potential results pages and ensure your Output follows the same structure.
- Spawn new Databoxes from the current one if you need to parallelize following links.

## How It Works

Each Databox is a wrapper for defining a composable Scraper script. Your function takes in Input provided by tooling or a CLI, performs an extraction and returns Output. A [Hero](/docs/hero) instance is automatically instantiated and passed into your function. Databoxes interact with a [Servers](/docs/server) - either on your local machine, or running remotely.

## Installation

To use Server in your project, install it with npm or yarn:

```bash
npm i --save @ulixee/databox-for-hero
```

or

```bash
yarn add @ulixee/databox-for-hero
```

When you install Server, it will also install [`Hero`](/docs/hero).

## Usage Example

Writing a Databox is very similar to writing a normal Hero script, except it must be contained within a callback, and you have make it the default export.

You can run this script as a regular node script and it will run the callback. However, this structure also allows us to load it into a server and run it on demand.

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

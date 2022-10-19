# Introduction

> Databoxes are specialized containers that package and run your scraper scripts. They provide your scripts a uniform input and output interface, and they return uniform results across any cloud.

## Why Create a Databox?

Databoxes create structure -- boundaries -- around a single "scrape", which make your scripts are far easier to test, re-try, scale and compose. It allows us to do things like:

- Restart a script during development as you change it.
- Rotate inputs to try out a variety of IPs, parameters, and more to make sure you can handle edge cases.
- Test the extraction of 100s of different potential results pages and ensure your Output follows the same structure.
- Spawn new Databoxes from the current one if you need to parallelize following links.

## How Databoxes Works

Each Databox is a wrapper for defining a composable scraper script. You can run databoxes directly from the command line or upload them to a [Server](/docs/server).

## Installation

To get started using Databox in your project, we have a "playground" that allows you to run examples out of the box. It can be installed using the following commands:

```bash
npm i --save @ulixee/databox-playground
```

or

```bash
yarn add @ulixee/databox-playground
```

## The Non-Playground Version

You can drop "-playground" whenever you want and use Databox directly (the playground makes getting started easier, but the core functionality is exactly the same):


```bash
npm i --save @ulixee/databox-playgrond
```

or

```bash
yarn add @ulixee/databox-playground
```

When using the non-playground version, it's your responsibility to ensure your Ulixee development environment is setup, such as installing and running [`@ulixee/server`](/docs/server).

## Usage Example

Writing a Databox is very similar to writing a normal Hero script, except it must be contained within a callback, and you have make it the default export.

The simplist Databox is initialized with a single `run` callback:

```js
export default new Databox(databox => {
  databox.output = `Hello ${databox.input.firstName}`;
});
```

You can run this script as a regular node script and it will run the callback. However, this structure also allows us to load it into a server and run it on demand.

```bash
npx @ulixee/databox-playground deploy
```

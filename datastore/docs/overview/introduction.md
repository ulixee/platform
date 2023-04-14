# Introduction

> Datastores are deployable "databases" that have extractors and tables, support native payment, and can be cloned and expanded as you see fit. Datastore Extractors contain data retrieval functions, like Hero scraper scripts, with structured input and output. Deploying a Datastore provides you with a structured Data API that can be privately consumed, or sold "out of the box".

## What is a Datastore?

Datastores create databases of specialized data structures - for instance, a Travel database, or a Jobs database. They're a combination of static metadata tables, dynamically retrieved web data and cached aggregated data that make up a data category. They support payment out of the box, so a client can pay per query without any setup or contracts. Datastores also support PostgreSQL natively (including payment), so can be tested out and integrated across programming languages.

## Datastore Extractors

Datastore Extractors create structure -- boundaries -- around a single "scrape", which make your scripts are far easier to test, re-try, scale and compose. It allows us to do things like:

- Restart a script during development as you change it.
- Rotate inputs to try out a variety of IPs, parameters, and more to make sure you can handle edge cases.
- Test the extraction of 100s of different potential results pages and ensure your Output follows the same structure.
- Spawn new Extractors from the current one if you need to parallelize following links.

## Datastore Crawlers

Datastore Crawlers allow you to write specialized Extractors that only output a "cached" scrape. It comes with built-in caching, so you can automatically re-use results that have been recently recorded.

## Datastore Tables

Datastore Tables allow you to manage and deploy database tables as part of your "api". This can be useful to enhance your functions with metadata or cached data.

## How Datastores Work

Each Datastore is a wrapper for defining a composable scraper script. You can run datastores directly from the command line or upload them to a [Cloud](https://ulixee.org/docs/cloud).

## Installation

To get started using Datastore in your project, use the following commands:

```bash
npm i --save @ulixee/datastore
```

or

```bash
yarn add @ulixee/datastore
```

It's your responsibility to ensure your Ulixee development environment is setup, such as installing and running [`@ulixee/cloud`](https://ulixee.org/docs/cloud).

## Usage Example

The simplest Datastore is initialized with a single Extractor:

```js
export default new Datastore({
  extractors: {
    default: new Extractor(ctx => {
      ctx.output = `Hello ${ctx.input.firstName}`;
    }),
  },
});
```

Save that script to your filesystem (i.e., simple.js), and run it as a regular node script:

```bash
node ./simple.js --input.firstName=Me
```

However, this Datastore structure also allows us to load it onto a CloudNode and run it on demand:

```bash
npx @ulixee/datastore deploy ./simple.js
npx @ulixee/datastore run simple.js --input.firstName=Me

```

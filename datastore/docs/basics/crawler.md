# Crawler

A Crawler is a specialized [Functino](./extractor.md) that allows you to scrape a webpage and automatically cache results. The following is a simple example:

```js
import { Crawler, HeroExtractorPlugin } from '@ulixee/datastore-plugins-hero';

const crawler = new Crawler(async context => {
  const hero = await new context.Hero();
  await hero.goto('https://ulixee.org');

  const resources = await hero.activeTab.waitForResources({ url: 'index.json' });
  for (const resource of resources) await resource.$addToDetachedResources('xhr');
  return hero;
}, HeroExtractorPlugin);
```

Crawlers automatically create a local [Table] to cache results. This means you can re-use the last Crawl by default. A desired "age" can be specified by including a `maxTimeInCache` parameter. `maxTimeInCache` defaults to 10 minutes. To skip the cache, you can supply 0, or include `disableCache: true` in the constructor arguments.

```js
const [crawl] = await crawler.stream({ input: { maxTimeInCache: 60 } });
const heroReplay = await HeroReplay(crawl);
```

## Constructor

### new Crawler _(function | crawlerComponents, ...plugins[])_ {#constructor}

Creates a new Crawler instance.

#### **Arguments**:

The first argument can be a single callback function matching the `run` callback below, or an object containing the following properties.

- run `function`(context: [ExtractorContext](./extractor-context.md)): `Promise<Crawler>`. A function that contains your script to run. The parameter is a [ExtractorContext](./extractor-context.md) that provides access to [input](./input.md).
  - NOTE: Crawlers do not specify `Output`, but must return an object implementing `toCrawlerOutput(): Promise<ICrawlerOutputSchema>`. This is an object containing `version`, `sessionId` and `crawler`.
- schema `IExtractorSchema`. Optional [schema](../advanced/extractor-schemas.md) defining the type-checked _input_ (only) parameters for the function. Output is not supported for Crawlers.
- disableCache `boolean`. Optional parameter to disable automatic caching of results.
- minimumPrice `number`. Optional minimum price that must be allocated in a Micronote for a caller.
- pricePerQuery `number`. Optional charge price per query.
- addOnPricing `object`. Optional pricing add-ons if your output varies widely in the amount of data that can be sent. This currently accepts a single property:
  - perKb `number`. A price per Kilobyte of data output.
- name `string`. Optional name for this Crawler, primarily used only if defining a Crawler outside a Datastore.

The second argument is a list of zero or more plugins.

- plugins `Array<Plugin>`. Optional. A list of [plugin-compatible classes](../advanced/plugins).

## Properties

### cache {#cache}

A Table automatically created to store cached results. The table name is `crawler_cache_${name}`, with columns:

- version `string`. The output Crawler version.
- sessionId `string`. The output Crawler sessionId.
- crawler `string`. The output type of Crawler.
- runTime `number`. The unix Date milliseconds of the crawl runtime.
- input `string`. A JSON serialization of the input enhanced with typing information (`@ulixee/commons/lib/TypeSerializer`).

## Methods

No public methods added from [Extractor](./extractor.md).

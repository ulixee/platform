# Introduction

> Datastores are structured, deployable "micro-databases" that combine private data sources, live-extracted web data and static metadata. Out of the box, they support charging per query using the [Argon](https://argonprotocol.org) currency. Best of all, any published Datastores can be stacked on top of each other using our "cloning" process.

## Core Features

- **Structured APIs:** Datastores create "constantly refreshing" databases of specialized data structures - for instance, a Travel database, or a Jobs database. They're a combination of static metadata tables, filtered views of internal data-sources, and dynamically retrieved web data.
- **Out of Box Payments:** Datastore costs can be completely customized for each published data entity: whether per Kilobyte of information, per extraction, or per query. You can get started very simply though - no need to setup a bank account or create customer contracts. Payments are made on a single query basis using the [Argon](https://argonprotocol.org), a fiat-independent stablecoin that you can export to your native currency whenever you choose.
- **Smart Caching:** Datastores automatically cache extracted data so you can reuse more complex data extraction across multiple client queries. You can also choose to allow the query-er to define how fresh the data should be.
- **Postgres Compatibility:** Datastores also support PostgreSQL natively (including payment), so can be tested out and integrated across programming languages.

## Payments

Datastores are designed to be monetized, but it's your choice. If you set a price per query, the user will be prompted to pay using Argon. Learn more about setting up payments in the [Datastore Payments](../basics/payments.md) guide.

## Structured Data

Datastores are designed to be structured, so you can easily query them using the Ulixee Desktop or the [@ulixee/client](https://ulixee.org/docs/client) library. Users will get a type-checked response using SQL and Typescript definitions.

They are built around these core data entities:

1. **Extractors:** Functions that take input and return output [more](../basics/extractor.md).
2. **Crawlers:** Web crawlers that load pages in a format that can be re-used and cached [more](../basics/crawler.md).
3. **Tables:** Database tables that can be queried and joined with your extractors [more](../basics/table.md).
4. **Cron Jobs:** Scheduled tasks that can run trigger Extractors or Crawlers to refresh data (**FUTURE FEATURE**).

## Enhanced Developer Experience

The structure of Datastores allows us to enhance the developer experience of building and testing scraping scripts using the [Hero](https://ulixee.org/docs/hero) scraping browser. It allows us to do things like:

- Automatically rerun a script during development as you change it.
- Timetravel through the script to see the exact state of the browser at any point.
- Rotate inputs to try out a variety of IPs, parameters, and more to make sure you can handle edge cases.
- Test the extraction of 100s of different potential results pages and ensure your Output follows the same structure.
- Spawn new Extractors from the current one if you need to parallelize following links.

## Installation

To get started using Datastore in your project, use the following commands:

```bash
npm i --save @ulixee/datastore
```

It's your responsibility to ensure your Ulixee development environment is setup, such as installing and running [`@ulixee/cloud`](https://ulixee.org/docs/cloud).

## Usage Example

The simplest Datastore is initialized with a single Extractor:

```js
export default new Datastore({
  extractors: {
    default: new Extractor(ctx => {
      ctx.Output.emit({ message: `Hello ${ctx.input.firstName}` });
    }),
  },
});
```

Save that script to your filesystem (i.e., simple.js), and start your datastore:

```bash
npx @ulixee/datastore start <path to datastore>

# or watching changes
npx @ulixee/datastore start --watch <path to datastore>
```

You can query it using Ulixee Desktop or the @ulixee/client library.

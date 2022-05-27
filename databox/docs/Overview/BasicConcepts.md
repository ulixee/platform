# Basic Concepts

## Contained Units

Databoxes contain all their core logic in a single unit. This unit can be run once or many times, both in a single process and across many processes. The callback function is able to be re-used, but a Databox can also be run directly as a node script.

Databoxes allow you further break down your script into a "run" section and an "extract" section. 

The 'run' step can be used with [Hero](/docs/hero) to interact with a website and collect assets like [Resources](/docs/databox/advanced-client/collected-resources), [HTML Fragments](/docs/databox/advanced-client/collected-fragmes) and [Data Snippets](/docs/databox/advanced-client/collected-snippets) that can be extracted later. 

The 'extract' function is passed in collected assets, but no Hero. You can use this function to pull out data from a synchronous set of assets (ie, you don't have to run your logic browser-side). It also allows you to run your extraction logic as a unit, which enables you to keep running it on assets collected from your last `run` until your logic works correctly. 

## Dynamically Configurable

Databoxes can have their configuration modified via command line, or passed into the [`databox.run({ input... })`](/docs/databox/basic-client/databox#run) method.

NOTE: you won't normally do this directly, but through the [`Runner`](/docs/runner) tool.

## Input / Output Creates Compose-ability

When you write a scraper script, you often need to run the same logic across a series of pages. Sometimes you know them ahead of time, and sometimes you spawn new tasks based on the data found in the current task. 

Databoxes are expected to use input to drive these dynamic starting points. They're also expected to return the same data format consistently.

When you combine these two ideas, it means your "Scraper scripts" can become simple functions that provide parameters and expect a result in a certain format. And it makes them infinitely composable.

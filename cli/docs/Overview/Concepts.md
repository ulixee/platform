# Basic Concepts
## Contained Units

Databoxes contain all their core logic in a single unit. This unit can be run once or many times, both in a single process and across many processes. The callback function is able to be re-used, but a Databox can also be run directly as a node script.

## Input / Output Creates Compose-ability

When you write a scraper script, you often need to run the same logic across a series of pages. Sometimes you know them ahead of time, and sometimes you spawn new tasks based on the data found in the current task. 

Databoxes are expected to use input to drive these dynamic starting points. They're also expected to return the same data format consistently.

When you combine these two ideas, it means your "Scraper scripts" can become simple functions that provide parameters and expect a result in a certain format. And it makes them infinitely composable.

## Deployable

Databoxes can be packaged up and deployed as a "unit" to a Ulixee Miner. You can query them using the [Stream](/docs/stream) library. By deploying to a Miner, Databoxes are able to run very efficiently - the code is cached, all individual commands for the Databox are run on the Miner and do not need serialization/transport to a Client. The only necessary communications are an "input" and the resulting "output" as a response.

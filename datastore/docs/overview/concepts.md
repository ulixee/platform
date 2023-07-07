# Basic Concepts

## Starting/Stopping/Deploying

Datastores must be started to use them. You start them by running @ulixee/datastore start <path>, which runs it on a local Cloud server (that you must start on your own, or via Ulixee Desktop). 

Once you start a Datastore, you can query it locally using the [@ulixee/client](https://ulixee.org/docs/client) pointed at the Datastore's url. A started Datastore's state will be erased when it stops. To create a longterm storage of data, you deploy a Datastore to a cloud.

## Contained Units

Datastore Extractors contain all their core logic in a single unit. This unit can be run once or many times, both in a single process and across many processes. The callback function is able to be re-used, but a Datastore can also be run directly as a node script.

## Input / Output Creates Compose-ability

When you write a scraper script, you often need to run the same logic across a series of pages. Sometimes you know them ahead of time, and sometimes you spawn new tasks based on the data found in the current task.

Datastore extractors and cralwers are expected to use input to drive these dynamic starting points. They're also expected to return the same data format consistently.

When you combine these two ideas, it means your "Scraper scripts" can become simple functions that provide parameters and expect a result in a certain format. And it makes them infinitely composable.

## Deployable

Datastores can be packaged up and deployed as a "unit" to a Ulixee CloudNode. You can query using the [Ulixee Client](https://ulixee.org/docs/client) library. By deploying to a CloudNode, Datastores are able to run very efficiently - the code is cached, all individual commands for the Datastore Extractors are run on the CloudNode and do not need serialization/transport to a Client. The only necessary communications are an "input" and the resulting "output" as a response.

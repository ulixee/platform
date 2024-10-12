# Relationship with Argon

> Argon is an inflation-proof stablecoin that is designed to handle micropayments as small as 1 millionth of a dollar. Ulixee comes built-in with support for Argon payments per-query.
> 
> It's used for payment in Ulixee Datastores, but the tax revenue generated from Datastore Micropayments can actually be turned around to close Argon blocks.

## Argon Overview

Argon is a sister-project to Ulixee, built by the same initial developers. It was built to solve the lack of payment options that satisfied the following needs:

### Cross border payments

The Ulixee developers live around the world, and consumers of Datastores are often in different countries. This makes it difficult to use traditional payment methods like bank transfers or credit cards. Argon is globally available and does not have to worry about conversion between currencies.

### Micropayments in high volume

A datastore might serve up millions of queries an hour. We wanted to build Ulixee so it could charge per-query, but still handle large volumes.  

### No contracts or agreements

Part of a per-query model is a response to the existing data silos that often require huge contracts with very restrictive data sharing terms. But this goes against the very reason scraping even exists - data is out in the open already. It shouldn't come with onerous restrictions and you should be able to pay for only what you use.

### Simple and Immediate

We wanted developers and data owners to be able to monetize their data immediately. It should be as easy as writing an adapter or scraper, wiring it up to a Datastore, and slapping a payment address on it.

### Safe to hold

Cryptocurrencies are highly volatile, so while we looked for an existing solution, we aimed for one that would support stable value (eg, a stablecoin). We didn't want developers to be anxious to unload their earnings, and we didn't want query-ers to worry about timing their currency acquisition. The Argon is a stablecoin, but actually goes one step further - it's not tied to a nation fiat currency, but to a basket of goods and services (eg, it's inflation proof).

## Datastores Closing Argon Blocks

Argon requires a tax on all transactions, which it uses to stabilize its value. For transactions over 1 Argon, this is set to ~20 cents. For any micropayments (under 1 Argon), it is only 20% of the transaction value. Argon tax is a little different than what you typically think of as a tax - it's a fee that you personally collect, but then are able to convert into "votes" on which block Argon should follow. If your vote is chosen, you get a portion of the rewards for closing the block.

Argon rewards start at 5 Argons per block, but also 5 Ownership tokens. There are 21 million overall ownership shares that will be created, and it follows a halving formula identical to Bitcoin. Argon Ownership tokens allow you to run Mining Nodes, which are able to mint new Argons as more demand for Argons outstrips supply.

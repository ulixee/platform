# 2.2 FIRST-PAYMENT-SETTLED
Most of these features will be pulled from Ulixee 1.0, but they will require some rewrites along the way.

- Purchase Coins 
  We will make purchasing coins possible with stable crypto currencies like the USDC. We anticipate making this possible via onramps for these currencies, or over existing Ethereum/Cardano/Solana/etc bridges.
  - Purchase coins with USDC onramp
  - Purchase coins on Ethereum

- Hold Reserve 
  The Argon will start off as an asset backed crypto currency. All holdings will be regularly published to provide confidence you can cash out at any time.
- Publish holdings
- Create public USDC or other account

- Sell Coins
  We will make it possible to transfer coins back out to USDC and other crypto currencies.
- Prove ownership
- Transfer coins out to Ethereum

- Burn
  To maintain a stable price relative to inflation, the Argon must burn 20% of all data request costs. Since the prices are infinitesimally small, this will be a very small amount of money per query. This is a critical component to ensuring that as long as demand holds, you can continue to buy bonds and the price will eventually go back up (based on percent of Argons getting burnt as percent of total holdings).
- Burn holdings from existence on Sidechain

- Pegging
  The Argon is pegged to the Consumer Price Index, using the US Dollar initially as a price bridge. We believe these are good starting points to make the Argon a global-first currency, as they are stable, but not tied to a specific country. The “bridge” fiat currency can be rotated out in the case of inflation. We also anticipate broadening the CPI to a global index at some point.
- CPI Oracle
- Current Argon Price (sourced from Sidechains or Oracles)

- The Purple Book (Summary of Commentary on Current Economic Conditions)
  This is an iterative idea based on the U.S. Federal Reserve’s Beige Book, but instead of being published eight times a year, the Argon Book will be published nightly. It will start as a one-page dashboard showing:
- Current CPI value being used by Argon (will use a Databox we deploy to AWS)
- Total Argons in circulation
- Total assets backing the Argon (along with on-chain proof).
- Yesterday’s Daily Burn
- Rolling Average Daily Burn over previous 30 days


# UNVERSIONED

## Multi-Network Contracts
- Purchase coins on Solana
- Purchase coins on Cardano

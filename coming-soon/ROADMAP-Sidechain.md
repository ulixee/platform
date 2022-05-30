# 2.2 
- Argon Holdings
  We will make it possible to transfer in and out holdings, as defined in the Argon section. Funds transferred in will be held in reserve.
- Onramp
- Offramp
- Published Holdings

- Full Transparency
  We will eventually require every sidechain to submit snapshots to the mainchain. Long-term, if any foul play is determined to occur, a Sidechain’s holding will be frozen and transferred to a new owner as voted by the network. In the interim, we will publish records of the Sidechain that prove it is solvent and adhering to rules.
- Publish asset holdings
- Publish batch outputs
- Publish individual holdings
- Proof of burn

- Batch Escrow
  Because queries are so cheap and our ultimate vision is that you could interact with a number of unknown parties to fulfill a data request, we determined that a batching system is needed. This batching system allows parties to ensure enough funds have been preallocated, and reduces blockchain network churn.
- Reserve funds in a batch
- Create a “job”
- Sidechain signs jobs
- Close up batches every 8 hours

- Trading/ERC20
  Sidechains will implement the ERC20 specification, allowing for balance lookup, transfers, and events (logs) reporting. Sidechains will have a maximum rate they can charge for transfers. This rate will be encouraged to be very low, but enough to prevent abuse of the system.
- Transfers
- Logs
- Fees

# UNVERSIONED

## Licensed Medallions
Ulixee’s mainchain will allow Shares to approve/reject which sidechains have a “license” to ride on top of the mainchain.

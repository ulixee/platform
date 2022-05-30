The current 2.0-alpha runs local Databoxes and Hero instances, and allows remote Hero instances to be run over Websockets.

The initial “Cloud” service will be deployed as a network of hosted Rigs (there will be multiple Rigs?)

## 2.0 - Run On Localhost


## 2.1 - First Remote Deployment
We need capabilities to deploy, remove and run remote Databoxes.
- Endpoint uploading and installing a Databox
  Testing
- Endpoint for running a local-on-the-service databox using the Packaged Databox hash
- Docker that runs on AWS

## 2.2 - Support Payment Wall
Long-term this will hold the code for creating, submitting, and tracking blocks on the chain. Short-term this will have a single latestBlock endpoint that returns the latest gens block. 
This adds support for Databoxes that want to add a payment. It will require Runner queries to contain a payment token, validate that payment tokens are from a trusted source before processing, and upon successful completion of the query, the Server will settle the transaction with the Sidechain.
- Sidechain verification
- Mainchain Module
- Payments Module

## 2.3 - First Network Cluster
Server should be able to operate as a load balancer for a series of other servers. You might also ask a server what other servers were available in the network. Each could operate as a load balancer and knew workloads of its cluster members so it could properly distribute new tasks. Some nodes may also operate as a “rig” and provide a set of services such as providing a public IP and connecting into the decentralized network.
- Load Balancing of Cluster
- Server Registration    

## 2.4 - Services and Management
The Server ecosystem needs to support a few services for IP Rotation and Catpcha solving. We want to have a plugin infrastructure where developers can choose their own, but we will also provide some defaults.
We need APIs to get statistics on how often different Databoxes have been hit, and how accurate the data has been.
- External Service - IP Proxy Service
- External Service - Catpcha Breaker Service
- Server Management - Endpoint Statistics
- Server Management - SessionDB Retrieval


# UNVERSIONED

## Deployment Scripting
We want to consider supporting one or more infrastructure scripting languages as well.
- Chef
- Terraform

## P2P Modules
Rigs have network services so that Miners can be simple Databox runners.
P2P Storage Lookup/Index
P2P Network Lookups

## Deploy to Multiple Clouds
We want to provide one click deployment options for server across various platforms.
AWS Lambda
Google Cloud Functions
Digital Ocean
Heroku
Kubernetes
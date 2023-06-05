# Node Registry

A Node Registry tracks nodes in a "cluster" and keeps a pulse of their workload. It's a hosted service that should have a single instance inside your cluster of nodes.

## Usage

You don't need to interact with the NodeRegistry beyond telling a node to connect to one or host one. Here are some options to provide to a CloudNode constructor to initialize a NodeRegistry:

### As a Provider

- nodeRegistryHost `self`. Optionally tell the node to point at self for node registry services.
- hostedServicesServerOptions `object`. Setting a port (or 0 to use 18181 or an open port) or host will activate the hosted services.

### As a Client

- nodeRegistryHost `string`. IP:port of the HostedServices server to connect to.
- servicesSetupHost `string`. IP:port of the HostedServices server to connect to for all service hosts.

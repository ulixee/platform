# Basic Concepts

## Zero Configuration Required

Out of the box, Ulixee Cloud doesn't need any configuration. It will find a local port to run on and will register all the Ulixee tools you have installed. Each tool defines it's own mechanism for interaction, so you just use the tools you expect.

## Each Tool Provides the Details

Ulixee tools like Datastore, Hero and Desktop/ChromeAlive! are all built with a similar structure that allows them to plug-in to Ulixee Cloud.

- `/main`: Each project has a Main or Client module with details on how to encode/decode Payloads and handle Websocket connection details.
- `/core`: Each project also has a Core module with details on how to route specific commands to the tool in question, but details of handling new WebSockets and encoding/decoding messages is handled by the Cloud [CoreRouter](https://github.com/ulixee/platform/tree/main/cloud/main/lib/CoreRouter.ts).

## Hosted Services

CloudNodes can share private services among your cluster of nodes (eg, Node tracking, Hero Session Replay storage, Statistics/Analytics, Datastore storage, etc). Ulixee clustering works by centralizing storage to a central node (as opposed to replicating across nodes). Some of these services will likely be external services at some point as well.

You can configure a CloudNode to activate HostedServices by providing a `hostedServicesServerOptions` object with listen options to the CloudNode constructor.

Other nodes will simply point at this internal `servicesSetupHost` (NOTE: it's separate from the default ip:port) to get the hostnames for all of the provided services.

# Basic Concepts

## Zero Configuration Required

Out of the box, Ulixee Server doesn't need any configuration. It will find a local port to run on and will register all the Ulixee tools you have installed. Each tool defines it's own mechanism for interaction, so you just use the tools you expect.

## Each Tool Provides the Details

Ulixee tools like Databox, Hero, ChromeAlive! and Runner are all built with a similar structure that allows them to plug-in to Ulixee Server.
- `/client`: Each project has a Client module with details on how to encode/decode Payloads and handle Websocket connection details.  
- `/core`: Each project also has a Core module with details on how to route specific commands to the tool in question, but details of handling new WebSockets and encoding/decoding messages is handled by Server `Connectors` (below).

`Connectors` are in the Server project, with one for each tool that needs it's own connection. `Connectors` define how to start and close a "Tool" and how to create new connections and decode/encode payloads.s

new Client(config: Config)

Every field of the config object is entirely optional. A Client instance will use environment variables for all missing values.

```javascript
type Config = {
  user?: string, // default process.env.ULX_SQL_USER || process.env.USER
  password?: string or function, //default process.env.ULX_SQL_PASSWORD
  host?: string, // default process.env.ULX_SQL_HOST
  database?: string, // default process.env.ULX_SQL_DATABASE || user
  port?: number, // default process.env.ULX_SQL_PORT
  connectionString?: string, // e.g. ulx://user:password@host:5432/database
  ssl?: any, // passed directly to node.TLSSocket, supports all tls.connect options
  types?: any, // custom type parsers
  statement_timeout?: number, // number of milliseconds before a statement in query will time out, default is no timeout
  query_timeout?: number, // number of milliseconds before a query call will timeout, default is no timeout
  application_name?: string, // The name of the application that created this Client instance
  connectionTimeoutMillis?: number, // number of milliseconds to wait for connection, default is no timeout
  idle_in_transaction_session_timeout?: number // number of milliseconds before terminating any session with an open idle transaction, default is no timeout
}
```

example to create a client with specific connection information:

```javascript
const SqlClient = require('@ulixee/sql')
 
const sqlClient = new SqlClient({
  host: 'my.database-server.com',
  port: 9000,
  user: 'database-user',
  password: 'secretpassword!!',
})

## client.connect

Calling client.connect with promises:

```
const SqlClient = require('@ulixee/sql')

const sqlClient = new SqlClient()
sqlClient
  .connect()
  .then(() => console.log('connected'))
  .catch((err) => console.error('connection error', err.stack))

```

## client.query

### QueryConfig

You can pass an object to client.query with the signature of:

```
type QueryConfig {
  // the raw query text
  text: string;
 
  // an array of query parameters
  values?: Array<any>;
 
  // name of the query - used for prepared statements
  name?: string;
 
  // by default rows come out as a key/value pair for each row
  // pass the string 'array' here to receive rows as an array of values
  rowMode?: string;
 
  // custom type parsers just for this query result
  types?: Types;
}
```

Running a query:

```
const { Client } = require('pg')
const client = new Client()
client.connect()
client
  .query('SELECT NOW()')
  .then((result) => console.log(result))
  .catch((e) => console.error(e.stack))
  .then(() => client.end())
```

## client.end

Disconnects the client from the PostgreSQL server.

```
client
  .end()
  .then(() => console.log('client has disconnected'))
  .catch((err) => console.error('error during disconnection', err.stack))
```

## Events

### error

When the client is in the process of connecting, dispatching a query, or disconnecting it will catch and foward errors from the PostgreSQL server to the respective client.connect client.query or client.end callback/promise; however, the client maintains a long-lived connection to the PostgreSQL back-end and due to network partitions, back-end crashes, fail-overs, etc the client can (and over a long enough time period will) eventually be disconnected while it is idle. To handle this you may want to attach an error listener to a client to catch errors. Here's a contrived example:

```
const client = new pg.Client()
client.connect()
 
client.on('error', (err) => {
  console.error('something bad has happened!', err.stack)
})
 
// walk over to server, unplug network cable
 
// process output: 'something bad has happened!' followed by stacktrace :P
```
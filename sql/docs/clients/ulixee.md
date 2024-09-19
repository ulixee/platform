# Stream Client

Ulixee Client is a full featured library that supports the full Ulixee SQL specification.

Below is an example of using Ulixee Client:

```js
import Client from '@ulixee/client';

const client = new Client('ulx://USER:PASS@HOST:PORT/DB');
const data = await client.query('SELECT * FROM table');
```

You can find more information on [Ulixee Client's documentation](../../client).

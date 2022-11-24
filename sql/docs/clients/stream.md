# Stream Client

Ulixee Stream is a full featured query tool that supports both SQL and NoSQL queries. 

Below is an example of using SQL with Stream:

```js
import Stream from '@ulixee/stream-playground';

const stream = new Stream('ulx://database');
stream.addJob('SELECT * FROM table');
stream.addJob(`SELECT * FROM function('Caleb')`);

await stream.waitForCompletion();
await stream.saveToJson('/')
```

You can find more information on Stream's documentation.

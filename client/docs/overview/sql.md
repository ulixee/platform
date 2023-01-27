# Using SQL

This Client library supports Ulixee SQL, which is a minimal subset of the ANSI SQL specification:

```javascript
import Client from '@ulixee/client-playground';

const client = new Client('ulx://USERNAME:PASSWORD@DOMAIN:PORT/DATABASE');
client.query(`SELECT * FROM developers WHERE status='founder'`).then(records => {
  console.log(records);
});
```

By default all query are read-only (i.e., they must be SELECTs) unless you have special admin privileges. 

More details are available in the [Ulixee SQL specification docs](../../sql).
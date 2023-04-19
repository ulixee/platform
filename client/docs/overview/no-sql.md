# Using NoSQL

Ulixee's NoSQL capabilities are still very minimal. You can do straightforward fetches, runs, and crawls, but no complicated structures such as joins are supported at this time. We recommend using Ulixee SQL for more complicated query needs.

Fetch datastore tables:

```javascript
import Client from '@ulixee/client-playground';

const client = new Client('ulx://USERNAME:PASSWORD@DOMAIN:PORT/DATABASE');
client.fetch('developers', { status: 'founders' }).then(records => {
  console.log(records);
});
```

Run datastore extractors:


```javascript
import Client from '@ulixee/client-playground';

const client = new Client('ulx://USERNAME:PASSWORD@DOMAIN:PORT/DATABASE');
client.run('lastCommit', { package: 'hero' }).then(records => {
  console.log(records);
});
```

Crawl datastore crawlers:


```javascript
import Client from '@ulixee/client-playground';

const client = new Client('ulx://USERNAME:PASSWORD@DOMAIN:PORT/DATABASE');
client.crawl('ulixee', { page: 'home' }).then(records => {
  console.log(records);
});
```

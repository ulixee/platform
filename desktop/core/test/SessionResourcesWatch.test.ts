import { Helpers } from '@ulixee/datastore-testing';
import { ITestKoaServer } from '@ulixee/datastore-testing/helpers';
import EventSubscriber from '@ulixee/commons/lib/EventSubscriber';
import { Session } from '@ulixee/hero-core';
import SessionResourcesWatch from '../lib/SessionResourcesWatch';

let koaServer: ITestKoaServer;
beforeAll(async () => {
  koaServer = await Helpers.runKoaServer();
  koaServer.get('/resources-search', ctx => {
    ctx.body = `<html>
<head>
<link rel="preload" href="/data.json" as="script">
</head>
<body>
<h1>Here</h1>
<script src="/script"></script>
</html>`;
  });
  koaServer.get('/script', ctx => {
    ctx.set('Content-Type', 'text/javascript');
    ctx.body = `
    const data = {
      "Wikipedia":true,
    };`;
  });
  koaServer.get('/data.json', ctx => {
    ctx.body = {
      hi: 'there',
      wiki: true,
    };
  });
});
afterAll(Helpers.afterAll);
afterEach(Helpers.afterEach);

describe('basic SessionResourcesWatch tests', () => {
  it('can find a resource', async () => {
    const exampleUrl = `${koaServer.baseUrl}/resources-search`;
    const { session, tab } = await Session.create({});
    const resourceSearch = new SessionResourcesWatch(session.db, new EventSubscriber());
    tab.on('resource', resourceSearch.onTabResource.bind(resourceSearch, tab.id));

    await tab.goto(exampleUrl);

    await tab.waitForResources({ url: `data.json` });
    await tab.waitForLoad('AllContentLoaded');
    await new Promise(resolve => setTimeout(resolve, 50));

    const context = {
      documentUrl: exampleUrl,
      tabId: tab.id,
      baseTime: session.createdTime,
      startTime: session.createdTime,
      endTime: Date.now(),
    };
    {
      const results = resourceSearch.search('wikipedia', context);
      expect(results).toHaveLength(1);
    }
    {
      const results = resourceSearch.search('Wiki', context);
      expect(results).toHaveLength(2);
    }
    {
      const results = resourceSearch.search('data.json', context);
      expect(results).toHaveLength(2); // one from body, one from url
    }
  });
});

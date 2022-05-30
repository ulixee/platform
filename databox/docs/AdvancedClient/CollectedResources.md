# CollectedResources

> CollectedResources is a class to retrieve Hero Resources saved for extraction. They include all network assets loaded to render a page, including CSS, Javascript, Fonts, Web Sockets, XHR/Fetch Requests, and more.

Hero [Resources](/docs/hero/advanced-client/resources) represent resources used to render a Page, including the HTTP Requests to retrieve them. Databox extends Hero to allow an easy mechanism to "save-off" Resources you wish to extract later.

Examples of this include JSON files, HTML Documents, PDFs, etc.

Saving them for extraction can be desirable because you can re-run your [Extractor](/docs/databox/advanced-client/extractor) repeatedly without having to restart a Headless browser (which can be significantly slower). Once they're saved, you can rapidly iterate on your extraction logic (eg, to transform a JSON payload) until it produces the desired output.

```js
import Databox from '@ulixee/databox-for-hero';

export default new Databox({
  async run({ hero }) {
    await hero.activeTab.on('resource', async resource => {
      if (resource.type === 'XHR') {
        await resource.$extractLater('xhr');
      }
    });
    await hero.goto('https://ulixee.org');
    await hero.waitForPaintingStable();
  },
  async extract({ collectedResources, output }) {
    const xhrs = await collectedResources.getAll('xhr');
    output.gridsomeData = [];
    for (const xhr of xhrs) {
      // NOTE: synchronous APIs.
      const jsonObject = xhr.json;
      if (xhr.json?.data) {
        output.gridsomeData.push(xhr.json.data);
      }
    }
  },
});
```

## Properties

### names

Retrieves all names that CollectedResources have been stored with.

#### **Returns** `Promise<string[]>`

## Methods

### collectedResources.get *(name)* {#get}

Get a single [Resource](/docs/hero/advanced-client/resource) extracted with the given name. All [Response](/docs/hero/advanced-client/resource-response) data is pre-fetched and decompressed (if necessary).

#### **Arguments**:

- name `string`. The name of the [Resource](/docs/hero/advanced-client/resource) to retrieve (assigned during extraction).

#### **Returns**: [`Promise<Resource>`](/docs/hero/advanced-client/resource) The [Resource](/docs/hero/advanced-client/resource).

### collectedResources.getAll *(name)* {#get-all}

Get a list of [Resources](/docs/hero/advanced-client/resource) extracted with the given name. All [Response](/docs/hero/advanced-client/resource-response) data is pre-fetched and decompressed (if necessary).

#### **Arguments**:

- name `string`. The name of the [Resources](/docs/hero/advanced-client/resource) to retrieve (assigned during extraction).

#### **Returns**: [`Promise<Resource[]>`](/docs/hero/advanced-client/resource) The [Resources](/docs/hero/advanced-client/resource).

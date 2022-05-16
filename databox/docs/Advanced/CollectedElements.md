# CollectedElements

> CollectedElements is a class to retrieve DOM Elements that were saved from a Databox session using $extract or $extractLater.

CollectedElements allows you to retrieve the DOM Elements saved using [`$extract`](/docs/databox/basic-interfaces/dom-extenders#extract) or [`$extractLater`](/docs/databox/basic-interfaces/dom-extenders#extract-later). Retrieved DOM Elements can be interacted with using normal HTML DOM Apis (no awaits are necessary).

```js
import Databox from '@ulixee/databox-for-hero';

export default new Databox({
  async run({ hero }) {
    await hero.goto('https://ulixee.org');
    const h1 = await hero.querySelector('h1').$waitForVisible();
    // Extract the DOM Element at this moment in time.
    await h1.$extractLater('h1');
    // ... do other things
  },
  async extract({ collectedElements }) {
    const h1 = await collectedElements.get('h1');
    // NOTE: synchronous APIs. No longer running in browser.
    const text = h1.textContent;
    const dataset = h1.dataset;
  },
});
```

## Properties

### names

Retrieves all names that CollectedElements have been stored with.

#### **Returns** `Promise<string[]>`

## Methods

### collectedElements.get*(name)* {#get}

Get a single DOM Element extracted with the given name.

#### **Arguments**:

- name `string`. The name of the DOM Element to retrieve (assigned during extraction).

#### **Returns**: `Promise<Element>` The (reconstituted) DOM Element.

### collectedElements.getAll*(name)* {#get-all}

Get a list of DOM Elements extracted with the given name. If you extract a `querySelectorAll`, all returned results will be in this list. Items will maintain the order they're collected in.

#### **Arguments**:

- name `string`. The name of the DOM Element list to retrieve (assigned during extraction).

#### **Returns**: `Promise<Element[]>` The (reconstituted) DOM Elements.

### collectedElements.getRawDetails*(name)* {#get-raw}

Get a list of extracted Elements with all the underlying details. This allows you to access the raw HTML as well as details about when and where a Node was extracted.

Details per `ICollectedElement` record are:

- id `number`. An assigned id.
- name `string`. The provided name for the CollectedElement.
- frameId `number`. The [FrameEnvironment](/docs/hero/basic-interfaces/frame-environment) id where the Element was extracted.
- frameNavigationId `number`. The id of the Navigation for the [Frame](/docs/hero/basic-interfaces/frame-environment) at time of extraction. 
- tabId `number`. The [Tab](/docs/hero/basic-interfaces/tab) id where the Element was extracted.
- commandId `number`. The [Command](/docs/hero/basic-interfaces/tab#lastCommandId) id at time of extraction.
- domChangesTimestamp `number`. The unix timestamp of the DOM at time of extraction.
- nodePointerId `number`. The internal tracking id assigned to the node.
- nodeType `string`. The type of node (eg, 'HTMLDivElement', 'HTMLLIElement')
- nodePreview `string`. A string preview created in the DOM at time of retrieval.
- outerHTML? `string`. The full outerHTML of the Node, recreated at the exact moment in the DOM.

#### **Arguments**:

- name `string`. The name given to the DOM Element during extraction.

#### **Returns**: `Promise<ICollectedElement[]>` The raw data for the CollectedElements.

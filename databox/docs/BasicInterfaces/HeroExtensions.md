# Hero Extensions

> Databox adds extraction functionality onto Hero DOM Elements and Resources to simplify extraction. All extension methods start with a $.

## Constructor

Extensions cannot be constructed. They're additions automatically added to the following Super classes and collections.

Nodes

- [`SuperElement`](/docs/awaited-dom/super-element)
- [`SuperHTMLElement`](/docs/awaited-dom/super-html-element)

Node Collections

- [`SuperNodeList`](/docs/awaited-dom/super-node-list)
- [`SuperHTMLCollection`](/docs/awaited-dom/super-html-collection)

Resources

- [`Resource`](/docs/hero/advanced/resource)

## Node Methods

### node.$extract<T\>_(extractFn, options?)_ {#extract}

Runs an extraction function inline after collecting the HTML of the given Element. The Dom Element this method is called on will be frozen at its current state, and the outerHTML will be extracted.

You can run this inline if you need access to your extracted data during your [Runner](/docs/databox/basic-interfaces/runner) script. For instance, if you wanted to calculate an "id" field for each row of a results page, and you wanted to re-use the logic across your [Runner](/docs/databox/basic-interfaces/runner) script as well as your [Extractor](/docs/databox/basic-interfaces/extractor).

#### **Arguments**:

- extractFn: `function`(element: `Element`, extractor: [`Extractor`](/docs/databox/basic-interfaces/extractor)): `Promise<any>`. A callback that will be called once the element outerHTML has been retrieved.
  - element `Element`. The collected element, available with synchronous DOM APIs.
  - extractor [`Extractor`](/docs/databox/basic-interfaces/extractor). Access to the Extractor that will run in your Databox `extract` step.
- options `object`. Optional settings to apply to this extraction
  - name `string`. A name to give to the [CollectedElement](/docs/databox/advanced/collected-elements) during final extraction. It does not need to be unique - items with the same name will be added to a list.

```js
import Databox from '@ulixee/databox-for-hero';

export default new Databox(async ({ hero }) => {
  await hero.goto('https://ulixee.org');
  const h1Children = await hero.querySelector('h1').$extract(h1 => {
    return [...h1.querySelectorAll('div')].map(x => x.textContent);
  });
});
```

#### **Returns**: `Promise<T>`. Returns the return value of the extractFn once completed.

### node.$extractLater*(name)* {#extract-later}

Collect an Element for extraction during the [Extractor](/docs/databox/basic-interfaces/extractor) callback. The advantage of `$extractLater` is you can defer extraction until later, where you can write your logic and re-run your extraction quickly as you fix it.

```js
import Databox from '@ulixee/databox-for-hero';

export default new Databox({
  async run({ hero }) {
    await hero.goto('https://ulixee.org');
    await hero.querySelector('h1').$extractLater('h1');
  },
  async extract({ collectedElements }) {
    const h1 = await collectedElements.get('h1');
    const h1Children = [...h1.querySelectorAll('div')].map(x => x.textContent);
  },
});
```

#### **Arguments**:

- name `string`. The name given to this extracted HTML Element. This name will be used to retrieve the [CollectedElement](/docs/databox/advanced/collected-element) in your [extract](/docs/databox/basic-interfaces/databox#constructor) function.

#### **Returns**: `Promise<void>`

## Collection Methods

### nodeList.$extract<T\>_(extractFn, options?)_ {#list-extract}

Runs an extraction function inline after collecting the HTML of the all HTML elements matching this NodeList.

This function is the same as `node.extract`, except the callback is provided a list of `Elements`.

#### **Arguments**:

- extractFn: `function`(elements: `Element[]`, extractor: [`Extractor`](/docs/databox/basic-interfaces/extractor)): `Promise<any>`. A callback that will be called once the element's outerHTML have been retrieved.
- options `object`. Optional settings to apply to this extraction
  - name `string`. A name to give to the [CollectedElements](/docs/databox/advanced/collected-elements) during final extraction. It does not need to be unique - items with the same name will be added to a list.

#### **Returns**: `Promise<T>`. Returns the return value of the extractFn once completed.

### nodeList.$extractLater*(name)* {#list-extract-later}

Collect the Node HTML for all Elements of a NodeList or HTMLElementCollection. They will be available for extraction during the [Extractor](/docs/databox/basic-interfaces/extractor) callback.

```js
import Databox from '@ulixee/databox-for-hero';

export default new Databox({
  async run({ hero }) {
    await hero.goto('https://ulixee.org');
    await hero.querySelectorAll('h1 div').$extractLater('h1 divs');
  },
  async extract({ collectedElements }) {
    const h1 = await collectedElements.getAll('h1 divs'); // will have 2 entries
    const h1Divs = h1.map(x => x.textContent);
  },
});
```

#### **Arguments**:

- name `string`. The name given to all extracted HTML Elements. This name will be used to retrieve the [CollectedElement](/docs/databox/advanced/collected-element) in your [extract](/docs/databox/basic-interfaces/databox#constructor) function.

#### **Returns**: `Promise<void>`

## Resource Methods

### resource.$extractLater*(name)* {#list-extract-later}

Collect the Resource and all metadata (including body) for later extraction.

```js
import Databox from '@ulixee/databox-for-hero';

export default new Databox({
  async run({ hero }) {
    await hero.goto('https://ulixee.org');
    const firstData = await hero.findResource({ url: 'index.json' });
    firstData.$extractLater('data');
  },
  async extract({ collectedResources }) {
    const resource = await collectedResources.get('data'); 
    // all resource methods are synchronous
    const indexJson = resource.json;
    // get headers (application/json)
    const contentType = resource.response.headers['Content-Type'];
  },
});
```

#### **Arguments**:

- name `string`. The name given to this [CollectedResource](/docs/databox/advanced/CollectedResources). It does not need to be unique - items with the same name will be added to a list.

#### **Returns**: `Promise<void>`

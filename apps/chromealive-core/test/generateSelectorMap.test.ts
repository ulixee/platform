import { Helpers } from '@ulixee/hero-testing';
import { DOMParser } from 'linkedom';
import generateSelectorMap, {
  decodeBitmask,
  getMaxBitmaskValue,
} from '../injected-scripts/generateSelectorMap';

afterAll(Helpers.afterAll);
afterEach(Helpers.afterEach);

test('bitmasks should convert', () => {
  expect(getMaxBitmaskValue([1, 2, 3])).toEqual(BigInt(0b111));
  expect(decodeBitmask(BigInt(0b1010), [1, 2, 3, 4])).toEqual([2, 4]);
});

test('should be able to find a shortest path', async () => {
  const domParser = new DOMParser();
  const document = domParser.parseFromString(
    `<body>
<div>
    <span class="link">Link</span>
</div>
</body>`,
    'text/html',
  );
  const element = document.querySelector('span');

  const results = generateSelectorMap(element, document);
  const matches = results.selectors;
  expect(matches.length).toBeGreaterThanOrEqual(50);
  expect(matches[0].selector).toBe('.link')
});

test('should be able to find a nested path', async () => {
  const domParser = new DOMParser();
  const document = domParser.parseFromString(
    `<body>
<div id="outer">
  <div class="inner" data-id="test1">
    <p>
      <a class="link">Link</a>
      <a class="link">Link</a>
    </p>
      <a class="link">Link</a>
  </div>
  
</div>
</body>`,
    'text/html',
  );
  const element = document.querySelectorAll('a')[1];

  const results = generateSelectorMap(element, document);
  const matches = results.selectors;
  expect(matches.length).toBeGreaterThanOrEqual(50);
  expect(matches[0].selector).toBe('p > a.link:nth-child(2)')
});

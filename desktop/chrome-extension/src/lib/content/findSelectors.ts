type ISelectorOption = string[];

interface ITarget {
  element: Element;
  selectorOptions: ISelectorOption[];
}

type IAncestors = ITarget[];
type ILayers = ITarget[];

const RankByType = {
  tag: 1,
  id: 2,
  class: 3,
  attr: 4,
};

function sortByLength(a, b) {
  return a.length - b.length;
}

export default function findSelectors(element: Element) {
  const target = generateTarget(element);
  const ancestors = generateAncestors(element);
  const layerKeyPairs = generateLayerKeyPairs(target, ancestors);
  const layers = [...ancestors, target];
  const possibleSelectorCount = calculatePossibleSelectorCount(layers, layerKeyPairs);

  console.log('target: ', target);
  console.log('ancestors: ', ancestors);
  console.log('ancestorsKeyPairs: ', layerKeyPairs);
  console.log('possibleSelectors: ', possibleSelectorCount);

  const selectors = generateShortSelectors(layers, layerKeyPairs);
  console.log('selectors: ', selectors);

  return selectors.sort(sortByLength);
}

function generateShortSelectors(layers: ILayers, ancestorKeyPairs: string[][]): string[] {
  const selectors: string[] = [];
  const maxSelectorCount = 1e3;
  let selectorDepth = 0;
  while (selectors.length < maxSelectorCount) {
    const maxSelectorCountRemaining = maxSelectorCount - selectors.length;
    const possibleSelectors = fetchSelectorsToCheck(
      selectorDepth,
      layers,
      ancestorKeyPairs,
      maxSelectorCountRemaining,
    );
    for (const possibleSelector of possibleSelectors) {
      const hasOneMatch = document.querySelectorAll(possibleSelector).length === 1;
      if (!hasOneMatch) continue;

      selectors.push(possibleSelector);
    }
    selectorDepth += 1;
  }
  return selectors;
}

function fetchSelectorsToCheck(
  depth: number,
  layers: ILayers,
  ancestorKeyPairs: string[][],
  maxSelectorCount: number,
): string[] {
  const selectors = [];
  for (const ancestorKeys of ancestorKeyPairs.filter(x => x.length === depth + 2)) {
    let baseSelectors = [''];
    let prevKey;
    for (const key of ancestorKeys) {
      let isDirectSibling = false;
      if (prevKey && Number(key) - Number(prevKey) === 1) {
        isDirectSibling = true;
      }
      const layer = layers[key];
      const selectorOptions = layer.selectorOptions.filter(x => x.length === depth + 1);
      baseSelectors = appendToSelectors(baseSelectors, selectorOptions, isDirectSibling);
    }
    for (const selector of baseSelectors) {
      selectors.push(selector);
    }
    if (selectors.length >= maxSelectorCount) break;
  }
  return selectors;
}

function appendToSelectors(
  baseSelectors,
  selectorOptions: ISelectorOption[],
  isDirectSibling: boolean,
): string[] {
  const newSelectors = [];
  const relation = isDirectSibling ? ' > ' : ' ';
  for (const selectorOption of selectorOptions) {
    try {
      const newPart = selectorOption.join('');
      for (const baseSelector of baseSelectors) {
        newSelectors.push(`${baseSelector}${relation}${newPart}`);
      }
    } catch (error) {
      console.log(selectorOption);
      throw error;
    }
  }
  return newSelectors;
}

function generateLayerKeyPairs(target: ITarget, ancestors: IAncestors): string[][] {
  const ancestorCombinations = generateAllCombinations(Object.keys(ancestors));
  const allCombinations: string[][] = [];
  for (const ancestorCombination of ancestorCombinations) {
    allCombinations.push([...ancestorCombination, ancestors.length.toString()]);
  }
  return allCombinations.sort(sortByLength);
}

function generateTarget(element: Element): ITarget {
  const selectorOptions = extractSelectorOptions(element);
  const parentElement = element.parentElement;
  try {
    const uniqueToParent = selectorOptions.filter(
      x => parentElement.querySelectorAll(x.join('')).length === 1,
    );
    return { element, selectorOptions: uniqueToParent };
  } catch (error) {
    console.log(selectorOptions);
    throw error;
  }
}

function generateAncestors(element: Element): IAncestors {
  const ancestors: IAncestors = [];
  while (element) {
    const parent = element.parentElement;
    if (parent.localName === 'body') break;
    const selectorOptions = extractSelectorOptions(parent);
    ancestors.unshift({ element: parent, selectorOptions });
    element = parent;
  }
  return ancestors;
}

function extractSelectorOptions(element: Element): ISelectorOption[] {
  const tagName = element.localName;
  const id = element.id && !element.id.match(/^[0-9]/) ? `#${element.id}` : null;
  const classes = Array.from(element.classList).map(x => `.${x}`);
  const attrNames = element.getAttributeNames().filter(k => !['class'].includes(k));
  const attrs = attrNames.map(x => {
    const v = element.getAttribute(x);
    // only treat ID as an attribute if it starts with a number
    if (x === 'id' && v && !v.match(/^[0-9]/)) return;
    return `[${x}="${v}"]`;
  });
  const parts = [
    { type: 'tag', rank: RankByType.tag, value: tagName },
    { type: 'id', rank: RankByType.id, value: id },
    ...classes.map(value => ({ type: 'class', rank: RankByType.class, value })),
    ...attrs.map(value => ({ type: 'attr', rank: RankByType.attr, value })),
  ].filter(x => x.value);

  const selectorCombinations = generateAllCombinations(parts).map(combination => {
    return combination.sort((a, b) => a.rank - b.rank);
  });

  selectorCombinations.sort((a, b) => {
    let aScore = a.length;
    if (a.some(x => x.type === 'attr')) aScore += 1;
    if (a[0].type === 'attr') aScore += 1;
    let bScore = b.length;
    if (b.some(x => x.type === 'attr')) bScore += 1;
    if (b[0].type === 'attr') bScore += 1;
    return aScore - bScore;
  });

  return selectorCombinations.map(x => x.map(y => y.value));
}

function generateAllCombinations(options) {
  function combinationFn(activeSet, restOfArray, all) {
    if (!activeSet.length && !restOfArray.length) return;
    if (!restOfArray.length) {
      all.push(activeSet);
    } else {
      combinationFn([...activeSet, restOfArray[0]], restOfArray.slice(1), all);
      combinationFn([...activeSet], restOfArray.slice(1), all);
    }
    return all;
  };
  return combinationFn([], [...options], []);
}

function calculatePossibleSelectorCount(layers: ILayers, ancestorKeyPairs: string[][]) {
  let count = 0;
  for (const ancestorKeys of ancestorKeyPairs) {
    let localCount = 1;
    for (const ancestorKey of ancestorKeys) {
      localCount *= layers[ancestorKey].selectorOptions.length;
    }
    count += localCount;
  }
  return count;
}

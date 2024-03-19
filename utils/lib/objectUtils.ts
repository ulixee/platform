export async function gettersToObject<T>(obj: T): Promise<T> {
  if (obj === null || obj === undefined || typeof obj !== 'object') return obj;

  const keys = [];
  // eslint-disable-next-line guard-for-in
  for (const key in obj) {
    keys.push(key);
  }

  if (obj[Symbol.iterator]) {
    const iterableToArray = [];
    // @ts-ignore
    for (const item of obj) {
      iterableToArray.push(await gettersToObject(item));
    }
    return iterableToArray as any;
  }

  const result = {} as any;
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(obj, key);
    // Skip functions
    if (descriptor && typeof descriptor.value === 'function') {
      continue;
    }
    const value = descriptor && descriptor.get ? descriptor.get.call(obj) : obj[key as keyof T];
    if (typeof value === 'function') continue;

    result[key] = await gettersToObject(value);
  }
  return result;
}

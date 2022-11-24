import INil from "../interfaces/INil";

export type Optional<T> = { [key in keyof T]?: T[key] };

type Impossible<K extends keyof any> = {
  [P in K]: never;
};
export type NoExtraProperties<T, U extends T = T> = U & Impossible<Exclude<keyof U, keyof T>>;

export type ReplaceReturnType<T, TNewReturn> = T extends (...a: any) => any
  ? (...a: Parameters<T>) => TNewReturn
  : never;

export class NotSupported extends Error {
  constructor(what?: string) {
    super(`Not supported${(what ? `: ${what}` : '')}`);
  }

  static never(value: never, msg?: string): NotSupported {
    return new NotSupported(`${msg ?? ''} ${JSON.stringify(value)}`);
  }
}

/**
 * An helper function that returns a map of an array, but:
 * - It will return the original array if it is null-ish
 * - It will remove all null-ish entries
 * - It will return the original array if nothing has changed
 */
export function arrayNilMap<T extends Object>(this: void, collection: T[] | INil, mapper: (v: T) => T | INil): T[] | INil {
  if (!collection?.length) {
    return collection;
  }
  let changed = false;
  let ret: T[] = collection;
  for (let i = 0; i < collection.length; i++) {
    const orig = collection[i];
    const val = mapper(orig);
    if (!changed && (!val || val !== orig)) {
      changed = true;
      ret = collection.slice(0, i);
    }
    if (!val) {
      continue;
    }
    if (changed) {
      ret.push(val);
    }
  }
  return ret;
}

type PartialNil<T> = {
  [P in keyof T]?: T[P] | INil;
};
/**
 * An helper function that returns a copy of an object with modified properties
 * (similar to Object.assign()), but ONLY if thos properties have changed.
 * Will return the original object if not.
 */
export function assignChanged<T>(orig: T, assign: PartialNil<T>): T {
  if (!orig) {
    return orig;
  }
  let changed = false;
  for (const k of Object.keys(assign)) {
    if ((orig as any)[k] !== (assign as any)[k]) {
      changed = true;
      break;
    }
  }
  if (!changed) {
    return orig;
  }
  return trimNullish({
    ...orig,
    ...assign,
  }, 0);
}

export function trimNullish<T>(value: T, depth = 5): T {
  if (depth < 0)
    return value;
  if (value instanceof Array) {
    value.forEach(x => trimNullish(x, depth - 1))
  }
  if (typeof value !== 'object' || value instanceof Date)
    return value;

  if (!value) {
    return value;
  }

  for (const k of Object.keys(value)) {
    const val = (value as any)[k];
    if (val === undefined || val === null)
      delete (value as any)[k];
    else
      trimNullish(val, depth - 1);
  }
  return value;
}
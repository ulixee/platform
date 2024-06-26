import ArgonUtils from '@ulixee/platform-utils/lib/ArgonUtils';
import { isRef, unref } from 'vue';

export function toArgons(amount: number | bigint, isMicrogons = false): string {
  if (amount === null || amount === undefined) return `${ArgonUtils.ArgonSymbol}0`;
  return ArgonUtils.format(amount, isMicrogons ? 'microgons' : 'milligons', 'argons');
}

export function titleCase(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatDate(date: Date | number): string {
  if (!date) return 'now';
  if (typeof date === 'number') date = new Date(date);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  });
}

export function deepUnref<T = any>(obj: T): T {
  if (isRef(obj)) {
    return deepUnref(unref(obj)) as T;
  }
  if (Array.isArray(obj)) {
    return obj.map(deepUnref) as T;
  }
  if (obj instanceof Uint8Array) {
    return Uint8Array.from(obj) as T;
  }
  if (obj && typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = deepUnref(value);
    }
    return result as T;
  }
  return obj;
}

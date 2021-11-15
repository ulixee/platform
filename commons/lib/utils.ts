import IResolvablePromise from '../interfaces/IResolvablePromise';
import Resolvable from './Resolvable';
import CallSite = NodeJS.CallSite;

export function assert(value: unknown, message?: string, reject?): void {
  if (value) return;
  const error = new Error(message);
  if (reject) {
    reject(error);
  } else {
    throw error;
  }
}

export function getCallSite(priorToFilename?: string, endFilename?: string): CallSite[] {
  const err = new Error();

  Error.prepareStackTrace = (_, stack) => stack;

  let stack = err.stack as unknown as CallSite[];

  Error.prepareStackTrace = undefined;
  let startIndex = 1;

  if (priorToFilename) {
    const idx = stack.findIndex(
      x => x.getFileName() === priorToFilename || x.getFileName()?.endsWith(priorToFilename),
    );
    if (idx >= 0) startIndex = idx + 1;
  }
  stack = stack.slice(startIndex);

  if (endFilename) {
    let lastIdx = -1;
    for (let i = stack.length - 1; i >= 0; i -= 1) {
      const x = stack[i];
      if (x.getFileName() === endFilename || x.getFileName()?.endsWith(endFilename)) {
        lastIdx = i;
        break;
      }
    }
    if (lastIdx >= 0) stack = stack.slice(0, lastIdx + 1);
  }
  return stack.filter(x => !!x.getFileName() && !x.getFileName()?.startsWith('internal'));
}

export function escapeUnescapedChar(str: string, char: string): string {
  let i = str.indexOf(char);
  while (i !== -1) {
    if (str[i - 1] !== '\\') {
      str = `${str.substr(0, i)}\\${str.substr(i)}`;
    }
    i = str.indexOf(char, i + 2);
  }
  return str;
}

export function pickRandom<T>(array: T[]): T {
  if (array.length === 1) return array[0];
  if (!array.length) throw new Error('Empty array provided to "pickRandom"');
  return array[Math.floor(Math.random() * array.length)];
}

export function bindFunctions(self: any): void {
  let object = self;
  do {
    for (const key of Reflect.ownKeys(object)) {
      if (key === 'constructor') {
        continue;
      }
      const descriptor = Reflect.getOwnPropertyDescriptor(object, key);
      if (
        descriptor &&
        typeof descriptor.value === 'function' &&
        !descriptor.get &&
        !descriptor.set &&
        descriptor.writable
      ) {
        self[key] = self[key].bind(self);
      }
    }
    object = Reflect.getPrototypeOf(object);
  } while (object && object !== Object.prototype);
}

export function createPromise<T = any>(
  timeoutMillis?: number,
  timeoutMessage?: string,
): IResolvablePromise<T> {
  return new Resolvable<T>(timeoutMillis, timeoutMessage);
}

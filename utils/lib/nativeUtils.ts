import { isAsyncFunction, isPromise } from 'node:util/types';

export async function wrapAsyncCall<
  Z,
  Fn extends keyof Z,
  T extends Z[Fn] extends (...args: any) => infer X ? X : never,
  Args extends Z[Fn] extends (...args: infer A) => any ? A : never,
>(owner: Z, name: Fn, ...args: Args): Promise<T> {
  try {
    const result = await (owner[name] as any).call(owner, ...args);
    return proxyIfNeeded(result);
  } catch (error) {
    const stack = new Error('').stack.slice(8).split(/\r?\n/g).slice(1).join('\n');
    const message = `Localchain - ${error.toString().replace('Error: ', '')}`;
    const newError = new Error(message);
    if ('code' in error) {
      (newError as any).code = error.code;
    }
    newError.stack = `${message}\n${stack}`;
    throw newError;
  }
}

function isPrimitive(value: any): boolean {
  if (
    !value ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint' ||
    typeof value === 'symbol' ||
    typeof value === 'undefined'
  ) {
    return true;
  }

  return (
    value instanceof BigInt ||
    value instanceof Date ||
    value instanceof Buffer ||
    Buffer.isBuffer(value) ||
    value instanceof ArrayBuffer ||
    value instanceof Set ||
    value instanceof Map ||
    value instanceof RegExp
  );
}

const proxies = new WeakSet<any>();
const proxiedObjects = new WeakSet<any>();
function proxyIfNeeded<T>(value: T, calledFromPromise = false): T {
  if (isPrimitive(value)) return value;
  if (isPromise(value)) {
    if (calledFromPromise) return value;
    return value.then(x => proxyIfNeeded(x, true)) as any;
  }
  if (Array.isArray(value)) return value.map(x => proxyIfNeeded(x)) as any;
  return proxyWrapper(value);
}

export function proxyWrapper<T>(proxyTarget: T): T {
  if (!proxyTarget) return proxyTarget;
  if (proxiedObjects.has(proxyTarget)) return proxyTarget;
  proxiedObjects.add(proxyTarget);

  const proxy = new Proxy(proxyTarget as any, {
    get(target, prop) {
      const descriptor = Object.getOwnPropertyDescriptor(target, prop);
      if (descriptor && descriptor.get) {
        const result = descriptor.get.call(target);
        return proxyIfNeeded(result);
      }
      const entry = target[prop];
      if (typeof prop === 'symbol') return entry;
      if (proxies.has(target)) return entry;

      if (entry && typeof entry === 'function') {
        if (isAsyncFunction(entry)) {
          return (...args: any[]) => wrapAsyncCall(target, prop, ...(args as any));
        }
        return (...args: any[]) => proxyIfNeeded(entry.call(target, ...args));
      }

      return proxyIfNeeded(entry);
    },
  });
  proxies.add(proxy);
  return proxy;
}

import Resolvable from '@ulixee/commons/lib/Resolvable';
import { bindFunctions } from '@ulixee/commons/lib/utils';

// modified from https://github.com/rolftimmermans/event-iterator
export default class ResultIterable<T, TMeta = any> implements AsyncIterable<T>, Promise<T[]> {
  public error?: Error;
  public results: T[] = [];

  public get resultMetadata(): Promise<TMeta> {
    return this.resolvable.promise.then(() => this._resultMetadata);
  }

  private resolvable = new Resolvable<T[]>();

  private _resultMetadata: TMeta;
  private readonly pullQueue: Array<Resolvable<IteratorResult<T>>> = [];
  private readonly pushQueue: Array<Promise<IteratorResult<T>>> = [];

  get [Symbol.toStringTag](): string {
    const pending = `${this.pullQueue.length + this.pushQueue.length} pending`;
    const completeStatus = this.error ? 'error' : 'done';
    return `ResultIterable(${this.results.length} results, ${
      this.resolvable.resolved ? completeStatus : pending
    })`;
  }

  constructor(private onComplete?: () => void) {
    // suppress unhandled rejections
    this.resolvable.promise.catch(() => null);
    bindFunctions(this);
  }

  public push(value: T): void {
    if (this.resolvable.isResolved) return;

    this.results.push(value);
    const resolution = { value, done: false };
    if (this.pullQueue.length) {
      this.pullQueue.shift().resolve(resolution);
    } else {
      this.pushQueue.push(Promise.resolve(resolution));
    }
  }

  public done(resultMetadata?: TMeta): void {
    if (this.resolvable.isResolved) return;
    this._resultMetadata = resultMetadata;
    this.resolvable.resolve(this.results);
    this.onComplete?.();

    for (const placeholder of this.pullQueue) {
      placeholder.resolve({ value: undefined, done: true });
    }

    this.pullQueue.length = 0;
  }

  public reject(error: Error): void {
    if (this.resolvable.isResolved) return;
    this.resolvable.reject(error);
    this.error = error;
    this.onComplete?.();

    if (this.pullQueue.length) {
      for (const placeholder of this.pullQueue) {
        placeholder.reject(error);
      }

      this.pullQueue.length = 0;
    } else {
      // eslint-disable-next-line promise/no-promise-in-callback
      const rejection = Promise.reject(error);

      /* Attach error handler to avoid leaking an unhandled promise rejection. */
      // eslint-disable-next-line promise/no-promise-in-callback
      rejection.catch(() => {});
      this.pushQueue.push(rejection);
    }
  }

  public then<TResult1 = T[], TResult2 = never>(
    onfulfilled?: ((value: T[]) => PromiseLike<TResult1> | TResult1) | undefined | null,
    onrejected?: ((reason: any) => PromiseLike<TResult2> | TResult2) | undefined | null,
  ): Promise<TResult1 | TResult2> {
    if (this.resolvable.isResolved) {
      return this.resolvable.then(onfulfilled, onrejected);
    }

    return new Promise<T[]>(async (resolve, reject) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        for await (const x of this) {
          // do nothing
        }
      } catch (error) {
        return reject(error);
      }
      return this.resolvable.then(resolve, reject);
    }).then(onfulfilled, onrejected);
  }

  public catch<TResult = never>(
    onrejected?: ((reason: any) => PromiseLike<TResult> | TResult) | undefined | null,
  ): Promise<T[] | TResult> {
    return this.resolvable.catch(onrejected);
  }

  public finally(onfinally?: (() => void) | undefined | null): Promise<T[]> {
    return this.resolvable.finally(onfinally);
  }

  public [Symbol.asyncIterator](): AsyncIterator<T> {
    if (this.resolvable.isResolved) {
      const iterator = this.results[Symbol.iterator]();
      return {
        next() {
          const next = iterator.next();
          return Promise.resolve(next);
        },
      };
    }
    return {
      next: this.iteratorResultNext,
      return: this.iteratorResultReturn,
      throw: this.iteratorResultThrow,
    };
  }

  private iteratorResultReturn(): Promise<IteratorResult<T>> {
    this.done();
    return Promise.resolve({ value: undefined, done: true });
  }

  private iteratorResultThrow(e?: Error): Promise<IteratorResult<T>> {
    this.reject(e);
    return Promise.resolve({ value: undefined, done: true });
  }

  private iteratorResultNext(): Promise<IteratorResult<T>> {
    if (this.error) return Promise.reject(this.error);

    const result = this.pushQueue.shift();
    if (result) {
      return result;
    }
    if (this.resolvable.isResolved) {
      return Promise.resolve({ value: undefined, done: true });
    }
    const pullResolvable = new Resolvable();
    this.pullQueue.push(pullResolvable);
    return pullResolvable.promise;
  }
}

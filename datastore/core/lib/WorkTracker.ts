import Resolvable from '@ulixee/commons/lib/Resolvable';
import { CanceledPromiseError } from '@ulixee/commons/interfaces/IPendingWaitEvent';
import Logger from '@ulixee/commons/lib/Logger';

const { log } = Logger(module);

export default class WorkTracker {
  private runPromises = new Set<Resolvable<any>>();
  private uploadPromises = new Set<Resolvable<any>>();

  constructor(public maxRuntimeMs: number) {}

  public async stop(waitForDatastoreCompletionOnShutdown: boolean): Promise<void> {
    if (!waitForDatastoreCompletionOnShutdown) {
      for (const promise of this.runPromises) {
        promise.reject(new CanceledPromiseError('Shutting down Cloud'), true);
        this.runPromises.delete(promise);
      }
    } else {
      log.info('Waiting for completing of remaining Datastore.query calls', {
        count: this.runPromises.size,
      } as any);
      await Promise.all([...this.runPromises].map(x => x.promise.catch(err => err)));
      this.runPromises.clear();
    }

    await Promise.all([...this.uploadPromises].map(x => x.promise.catch(err => err)));
    this.uploadPromises.clear();
  }

  public trackUpload<T>(uploadPromise: Promise<T>): Promise<T> {
    const resolvable = new Resolvable<T>(30e3);
    this.uploadPromises.add(resolvable);

    void uploadPromise
      .then(resolvable.resolve)
      .catch(resolvable.reject)
      .finally(() => this.uploadPromises.delete(resolvable));
    return resolvable.promise;
  }

  public trackRun<TOutput>(outputPromise: Promise<TOutput>): Promise<TOutput> {
    const resolvable = new Resolvable(this.maxRuntimeMs);
    this.runPromises.add(resolvable);

    void outputPromise
      .then(resolvable.resolve)
      .catch(resolvable.reject)
      .finally(() => this.runPromises.delete(resolvable));

    return resolvable.promise;
  }
}

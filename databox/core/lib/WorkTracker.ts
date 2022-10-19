import Resolvable from '@ulixee/commons/lib/Resolvable';
import { CanceledPromiseError } from '@ulixee/commons/interfaces/IPendingWaitEvent';
import Logger from '@ulixee/commons/lib/Logger';

const { log } = Logger(module);

export default class WorkTracker {
  private runPromises = new Set<Resolvable<{ output: any }>>();
  private uploadPromises = new Set<Resolvable<any>>();

  constructor(public maxRuntimeMs: number) {}

  public async stop(waitForDataboxCompletionOnShutdown: boolean): Promise<void> {
    if (!waitForDataboxCompletionOnShutdown) {
      for (const promise of this.runPromises) {
        promise.reject(new CanceledPromiseError('Shutting down Server'));
        this.runPromises.delete(promise);
      }
    } else {
      log.info('Waiting for completing of remaining Databox.execs', {
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

  public trackRun(outputPromise: Promise<{ output: any }>): Promise<{ output: any }> {
    const resolvable = new Resolvable<{ output: any }>(this.maxRuntimeMs);
    this.runPromises.add(resolvable);

    void outputPromise
      .then(resolvable.resolve)
      .catch(resolvable.reject)
      .finally(() => this.runPromises.delete(resolvable));

    return resolvable.promise;
  }
}

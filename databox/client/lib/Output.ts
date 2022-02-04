import { inspect } from 'util';
import ICoreSession from '@ulixee/hero/interfaces/ICoreSession';
import ObjectObserver from './ObjectObserver';

export default class Output<T = any> extends Array<T> {
  [key: string]: any;

  toJSON(): any {
    if (this.length && Object.keys(this).every(x => !Number.isNaN(x))) {
      return [...this];
    }
    const result: any = {};
    for (const [key, value] of Object.entries(this)) {
      result[key] = value;
    }
    return result;
  }

  [inspect.custom](): any {
    return this.toJSON();
  }
}

export function createObservableOutput<T>(coreSessionPromise: Promise<ICoreSession>): Output<T> {
  const observable = new ObjectObserver(new Output());
  observable.onChanges = changes => {
    const changesToRecord = changes.map(change => ({
      type: change.type as string,
      value: change.value,
      path: JSON.stringify(change.path),
      timestamp: Date.now(),
    }));

    coreSessionPromise.then(coreSession => coreSession.recordOutput(changesToRecord)).catch(() => null);
  };
  return observable.proxy;
}

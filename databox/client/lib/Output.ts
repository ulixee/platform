import { inspect } from 'util';
import ObjectObserver from './ObjectObserver';
import IObservableChange from '../interfaces/IObservableChange';

export default class Output<T = any> extends Array<T> {
  [key: string]: any;

  toJSON(): any {
    // checks if all keys are numbers (eg, an array), in which case, we will return a copy of the properties
    if (
      this.length &&
      Object.keys(this)
        .map(Number)
        .every(x => Number.isInteger(x) && x >= 0)
    ) {
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

export function createObservableOutput<T>(
  onChanges: (changes: IObservableChange[]) => void,
): Output<T> {
  const observable = new ObjectObserver(new Output());
  observable.onChanges = onChanges;
  return observable.proxy;
}

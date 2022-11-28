import IDataboxComponents from '../interfaces/IDataboxComponents';
import Function from './Function';
import IFunctionComponents from '../interfaces/IFunctionComponents';
import IFunctionContext from '../interfaces/IFunctionContext';

const pkg = require('../package.json');

export default class Databox<
  Fns extends Function<any>,
  TContext extends IFunctionComponents<any, IFunctionContext<any>>,
  TComponents extends IDataboxComponents<Fns, TContext> = IDataboxComponents<Fns, TContext>,
  TFunctionNames extends keyof TComponents['functions'] & string = keyof TComponents['functions'] &
    string,
> {
  public readonly coreVersion = pkg.version;
  public readonly functions: {
    [T in TFunctionNames]: TComponents['functions'][T] extends Function<any>
      ? TComponents['functions'][T]
      : TComponents['functions'][T] extends TContext
      ? Function<TComponents['functions'][T]['schema']>
      : Function<any>;
  } = {} as any;

  constructor(components: TComponents) {
    for (const [key, func] of Object.entries(components.functions)) {
      if (func instanceof Function) {
        this.functions[key] = func as any;
      } else {
        this.functions[key] = new Function(func) as any;
      }
    }
  }
}

import { ILog } from '../interfaces/ILog';
import { LogDefault } from './LogDefault';

const hasBeenLoggedSymbol = Symbol.for('hasBeenLogged');
const loggerSessionIdNames = new Map<string, string>();

let logCreator = (module: NodeModule): { log: ILog } => {
  const log: ILog = new LogDefault(module);

  return {
    log,
  };
};

export function Logger(module: NodeModule): ILogBuilder {
  return logCreator(module);
}

export { loggerSessionIdNames, hasBeenLoggedSymbol };

export function injectLogger(builder: (module: NodeModule) => ILogBuilder): void {
  logCreator = builder;
}

interface ILogBuilder {
  log: ILog;
}

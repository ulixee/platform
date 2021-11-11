// eslint-disable-next-line max-classes-per-file
import { inspect } from 'util';
import ILog, { ILogData } from '../interfaces/ILog';

const hasBeenLoggedSymbol = Symbol.for('hasBeenLogged');

let logId = 0;
class Log implements ILog {
  public readonly level: string = process.env.DEBUG ? 'stats' : 'error';
  public useColors =
    process.env.NODE_DISABLE_COLORS !== 'true' && process.env.NODE_DISABLE_COLORS !== '1';

  protected readonly boundContext: any = {};
  private readonly module: string;
  private readonly logLevel: number;

  constructor(module: NodeModule, boundContext?: any) {
    this.logLevel = logLevels.indexOf(this.level);
    this.module = module ? extractPathFromModule(module) : '';
    if (boundContext) this.boundContext = boundContext;
  }

  public stats(action: string, data?: ILogData): number {
    return this.log('stats', action, data);
  }

  public info(action: string, data?: ILogData): number {
    return this.log('info', action, data);
  }

  public warn(action: string, data?: ILogData): number {
    return this.log('warn', action, data);
  }

  public error(action: string, data?: ILogData): number {
    return this.log('error', action, data);
  }

  public createChild(module, boundContext?: any): ILog {
    const Constructor = this.constructor;
    // @ts-ignore
    return new Constructor(module, {
      ...this.boundContext,
      ...boundContext,
    });
  }

  public flush(): void {
    // no-op
  }

  protected logToConsole(level: LogLevel, entry: ILogEntry) {
    const printablePath = entry.module.replace('.js', '').replace('.ts', '').replace('build/', '');

    const { error, printData } = translateToPrintable(entry.data);

    if (level === 'warn' || level === 'error') {
      printData.sessionId = entry.sessionId;
      printData.sessionName = loggerSessionIdNames.get(entry.sessionId) ?? undefined;
    }

    const params = Object.keys(printData).length ? [printData] : [];
    if (error) params.push(error);

    // eslint-disable-next-line no-console
    console.log(
      `${entry.timestamp.toISOString()} ${entry.level.toUpperCase()} [${printablePath}] ${
        entry.action
      }`,
      ...params.map(x => inspect(x, false, null, this.useColors)),
    );
  }

  private log(level: LogLevel, action: string, data?: ILogData): number {
    let logData: object;
    let sessionId: string = this.boundContext.sessionId;
    let parentId: number;
    const mergedData = { ...data, context: this.boundContext };
    if (mergedData) {
      for (const [key, val] of Object.entries(mergedData)) {
        if (key === 'parentLogId') parentId = val as number;
        else if (key === 'sessionId') sessionId = val as string;
        else {
          if (!logData) logData = {};
          logData[key] = val;
        }
      }
    }
    logId += 1;
    const id = logId;
    const entry: ILogEntry = {
      id,
      sessionId,
      parentId,
      timestamp: new Date(),
      action,
      data: logData,
      level,
      module: this.module,
    };
    if (logLevels.indexOf(level) >= this.logLevel) {
      this.logToConsole(level, entry);
    }
    LogEvents.broadcast(entry);
    return id;
  }
}

function translateValueToPrintable(value: any, depth = 0): any {
  if (value === undefined || value === null) return;
  if (value instanceof Error) {
    return value.toString();
  }
  if (value instanceof RegExp) {
    return `/${value.source}/${value.flags}`;
  }
  if ((value as any).toJSON) {
    return (value as any).toJSON();
  }
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (depth > 2) return value;

  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return value.map(x => translateValueToPrintable(x, depth + 1));
    }
    const result: any = {};
    for (const [key, subValue] of Object.entries(value)) {
      result[key] = translateValueToPrintable(subValue, depth + 1);
    }
    return result;
  }
}

export function translateToPrintable(
  data: any,
  result?: { error?: Error; printData: any },
): { error?: Error; printData: any } {
  result ??= { printData: {} };
  const { printData } = result;
  for (const [key, value] of Object.entries(data)) {
    if (value instanceof Error) {
      Object.defineProperty(value, hasBeenLoggedSymbol, {
        enumerable: false,
        value: true,
      });
      result.error = value;
    }
    const printable = translateValueToPrintable(value);
    if (printable === null || printable === undefined) continue;
    printData[key] = printable;
  }
  return result;
}

const logLevels = ['stats', 'info', 'warn', 'error'];

let logCreator = (module: NodeModule): { log: ILog } => {
  const log: ILog = new Log(module);

  return {
    log,
  };
};

export default function logger(module: NodeModule): ILogBuilder {
  return logCreator(module);
}

let idCounter = 0;

const loggerSessionIdNames = new Map<string, string>();

class LogEvents {
  private static subscriptions: { [id: number]: (log: ILogEntry) => any } = {};

  public static unsubscribe(subscriptionId: number): void {
    delete LogEvents.subscriptions[subscriptionId];
  }

  public static subscribe(onLogFn: (log: ILogEntry) => any): number {
    idCounter += 1;
    const id = idCounter;
    LogEvents.subscriptions[id] = onLogFn;
    return id;
  }

  public static broadcast(entry: ILogEntry): void {
    Object.values(LogEvents.subscriptions).forEach(x => x(entry));
  }
}

export { Log, LogEvents, loggerSessionIdNames, hasBeenLoggedSymbol };

export function injectLogger(builder: (module: NodeModule) => ILogBuilder): void {
  logCreator = builder;
}

export interface ILogEntry {
  id: number;
  timestamp: Date;
  action: string;
  module: string;
  sessionId?: string;
  parentId?: number;
  data?: any;
  level: LogLevel;
}

type LogLevel = 'stats' | 'info' | 'warn' | 'error';

interface ILogBuilder {
  log: ILog;
}

function extractPathFromModule(module: NodeModule): string {
  const fullPath = typeof module === 'string' ? module : module.filename || module.id || '';
  return fullPath.replace(/^(.*)\/ulixee\/(.*)$/, '$2').replace(/^.*\/packages\/(.*)$/, '$2');
}

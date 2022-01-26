import * as Path from 'path';
import * as Os from 'os';
import * as Fs from 'fs';
import ICoreConfigureOptions from '@ulixee/databox-interfaces/ICoreConfigureOptions';
import Log, { hasBeenLoggedSymbol } from '@ulixee/commons/lib/Logger';
import Resolvable from '@ulixee/commons/lib/Resolvable';
import ConnectionToClient from './connections/ConnectionToClient';
import Session from './lib/Session';
import GlobalPool from './lib/GlobalPool';
import Signals = NodeJS.Signals;

const { log } = Log(module);
let dataDir = process.env.DATABOX_DATA_DIR || Path.join(Os.tmpdir(), '.ulixee'); // transferred to GlobalPool below class definition

export { GlobalPool, Session };

export default class Core {
  public static readonly connections: ConnectionToClient[] = [];

  public static onShutdown: () => void;

  public static allowDynamicPluginLoading = true;
  public static isClosing: Promise<void> = null;
  private static wasManuallyStarted = false;
  private static isStarting = false;

  public static addConnection(): ConnectionToClient {
    const connection = new ConnectionToClient();
    connection.on('close', () => {
      const idx = this.connections.indexOf(connection);
      if (idx >= 0) this.connections.splice(idx, 1);
      this.checkForAutoShutdown();
    });
    this.connections.push(connection);
    return connection;
  }

  public static async start(
    options: ICoreConfigureOptions = {},
    isExplicitlyStarted = true,
  ): Promise<void> {
    if (this.isStarting) return;
    const startLogId = log.info('Core.start', {
      options,
      isExplicitlyStarted,
      sessionId: null,
    });
    this.isClosing = null;
    this.isStarting = true;
    if (isExplicitlyStarted) this.wasManuallyStarted = true;

    const { localProxyPortStart, maxConcurrentClientCount } = options;

    if (maxConcurrentClientCount !== undefined)
      GlobalPool.maxConcurrentClientCount = maxConcurrentClientCount;

    if (localProxyPortStart !== undefined)
      GlobalPool.localProxyPortStart = options.localProxyPortStart;

    if (options.dataDir !== undefined) {
      this.dataDir = options.dataDir;
    }

    await GlobalPool.start();

    log.info('Core started', {
      sessionId: null,
      parentLogId: startLogId,
      dataDir: this.dataDir,
    });
  }

  public static async shutdown(): Promise<void> {
    if (this.isClosing !== null) return this.isClosing;

    const isClosing = new Resolvable<void>();
    this.isClosing = isClosing.promise;

    this.isStarting = false;
    const logid = log.info('Core.shutdown');
    const shutDownErrors: Error[] = [];
    try {
      await Promise.all(this.connections.map(x => x.disconnect())).catch(error =>
        shutDownErrors.push(error),
      );
      await GlobalPool.close().catch(error => shutDownErrors.push(error));

      this.wasManuallyStarted = false;
      if (this.onShutdown) this.onShutdown();
      isClosing.resolve();
    } catch (error) {
      isClosing.reject(error);
    } finally {
      log.info('Core.shutdownComplete', {
        parentLogId: logid,
        sessionId: null,
        errors: shutDownErrors.length ? shutDownErrors : undefined,
      });
    }
    return isClosing.promise;
  }

  public static logUnhandledError(clientError: Error, fatalError = false): void {
    if (!clientError || clientError[hasBeenLoggedSymbol]) return;
    if (fatalError) {
      log.error('UnhandledError(fatal)', { clientError, sessionId: null });
    } else if (!clientError[hasBeenLoggedSymbol]) {
      log.error('UnhandledErrorOrRejection', { clientError, sessionId: null });
    }
  }

  private static checkForAutoShutdown(): void {
    if (Core.wasManuallyStarted || this.connections.some(x => x.isActive())) return;

    Core.shutdown().catch(error => {
      log.error('Core.autoShutdown', {
        error,
        sessionId: null,
      });
    });
  }

  public static get dataDir(): string {
    return dataDir;
  }

  public static set dataDir(dir: string) {
    const absoluteDir = Path.isAbsolute(dir) ? dir : Path.join(process.cwd(), dir);
    if (!Fs.existsSync(`${absoluteDir}`)) {
      Fs.mkdirSync(`${absoluteDir}`, { recursive: true });
    }
    dataDir = absoluteDir;
  }
}

['exit', 'SIGTERM', 'SIGINT', 'SIGQUIT'].forEach(name => {
  process.once(name as Signals, async () => {
    await Core.shutdown();
  });
});

if (process.env.NODE_ENV !== 'test') {
  process.on('uncaughtExceptionMonitor', async (error: Error) => {
    await Core.logUnhandledError(error, true);
    await Core.shutdown();
  });
  process.on('unhandledRejection', async (error: Error) => {
    await Core.logUnhandledError(error, false);
  });
}

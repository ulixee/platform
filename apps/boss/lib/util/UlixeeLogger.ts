import log from 'electron-log';
import { injectLogger, loggerSessionIdNames } from '@ulixee/commons/lib/Logger';
import { ILogEntry } from '@ulixee/commons/interfaces/ILogEntry';
import { LogDefault, translateToPrintable } from '@ulixee/commons/lib/LogDefault';

class UlixeeLogger extends LogDefault {
  protected logToConsole(level: ILogEntry['level'], entry: ILogEntry) {
    const printablePath = entry.module
      .replace('.js', '')
      .replace('.ts', '')
      .replace('build/', '')
      .replace('apps/boss/packages', '');

    const { error, printData } = translateToPrintable(entry.data);

    if (level === 'warn' || level === 'error') {
      printData.sessionId = entry.sessionId;
      printData.sessionName = loggerSessionIdNames.get(entry.sessionId) ?? undefined;
    }

    const params = Object.keys(printData).length ? [printData] : [];
    if (error) params.push(error);

    const args = [`[${printablePath}] ${entry.action}`, ...params];
    if (level === 'stats') {
      log.debug(...args);
    } else {
      log[level](...args);
    }
  }
}

injectLogger(module => {
  return { log: new UlixeeLogger(module) };
});

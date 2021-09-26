import { fork } from 'child_process';
import {
  ISessionResumeArgs,
  ISessionResumeResult,
} from '@ulixee/apps-chromealive-interfaces/apis/ISessionResumeApi';
import Log from '@ulixee/commons/lib/Logger';
import ChromeAliveCore from '../index';

const { log } = Log(module);

export default function sessionResumeApi(args: ISessionResumeArgs): ISessionResumeResult {
  const sessionId = args.heroSessionId ?? ChromeAliveCore.activeHeroSessionId;
  if (!sessionId || !ChromeAliveCore.sessionObserversById.has(sessionId))
    throw new Error('No active sessionId found');

  const observer = ChromeAliveCore.sessionObserversById.get(sessionId);
  const { heroSession } = observer;

  const startNavigationId = args.startFromNavigationId;
  const startLocation = args.startLocation;

  const script = heroSession.options.scriptInstanceMeta?.entrypoint;
  const execArgv = [
    `--sessionResume.startLocation`,
    startLocation,
    `--sessionResume.sessionId`,
    heroSession.id,
  ];
  if (startNavigationId) {
    execArgv.push(`--sessionResume.startNavigationId`, String(args.startFromNavigationId));
  }
  if (script.endsWith('.ts')) {
    execArgv.push('-r', 'ts-node/register');
  }

  let success = true;
  let error: Error;
  try {
    log.info('Resuming session', { execArgv, sessionId });
    fork(script, execArgv, {
      // execArgv,
      stdio: 'inherit',
      env: { ...process.env, HERO_CLI_NOPROMPT: 'true' },
    });
  } catch (err) {
    log.error('ERROR resuming session', { error, sessionId });
    success = false;
    error = err;
  }

  return {
    success,
    error,
  };
}

import ISessionCreateOptions from '@ulixee/hero-interfaces/ISessionCreateOptions';
import { fork } from 'child_process';
import {
  ISessionResumeArgs,
  ISessionResumeResult,
} from '@ulixee/apps-chromealive-interfaces/apis/ISessionResumeApi';
import ChromeAliveCore from '../index';

export default function sessionResumeApi(args: ISessionResumeArgs): ISessionResumeResult {
  const sessionId = args.sessionId ?? ChromeAliveCore.activeSessionId;
  if (!sessionId || !ChromeAliveCore.sessionObserversById.has(sessionId))
    throw new Error('No active sessionId found');

  const observer = ChromeAliveCore.sessionObserversById.get(sessionId);
  const { session } = observer;

  let startUrl = '';

  let startLocation: ISessionCreateOptions['sessionResume']['startLocation'] = 'currentLocation';
  if (args.startFromTick !== undefined) {
    if (args.startFromTick <= 0) {
      startLocation = 'sessionStart';
    } else if (args.startFromTick < observer.ticks.length - 1) {
      startUrl = observer.ticks[args.startFromTick].url;

      startLocation = 'pageStart';
    }
  }

  const script = session.options.scriptInstanceMeta?.entrypoint;
  const execArgv = [
    `--sessionResume.startLocation`,
    startLocation,
    `--sessionResume.sessionId`,
    session.id,
  ];
  if (startUrl) {
    execArgv.push(`--sessionResume.startUrl`, startUrl);
  }
  if (script.endsWith('.ts')) {
    execArgv.push('-r', 'ts-node/register');
  }
  let success = true;
  let error: Error;
  try {
    fork(script, execArgv, {
      // execArgv,
      stdio: 'inherit',
    });
  } catch (err) {
    console.log(err);
    success = false;
    error = err;
  }

  return {
    success,
    error,
  };
}

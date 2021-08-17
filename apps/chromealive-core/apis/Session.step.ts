import {
  ISessionStepArgs,
  ISessionStepResult,
} from '@ulixee/apps-chromealive-interfaces/apis/ISessionStepApi';
import ChromeAliveCore from '../index';

export default function sessionStepApi(args: ISessionStepArgs): ISessionStepResult {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { session } = ChromeAliveCore.sessionObserversById.get(args.sessionId);

  // TODO: build step function into core.
  // session.pauseCommands();

  return {
    success: true,
  };
}

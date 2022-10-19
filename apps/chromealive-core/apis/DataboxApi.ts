import { IHeroSessionArgs } from '@ulixee/apps-chromealive-interfaces/apis/ISessionApi';
import IDataboxApi, {
  IDataboxApiStatics,
} from '@ulixee/apps-chromealive-interfaces/apis/IDataboxApi';
import SessionObserver from '../lib/SessionObserver';
import ChromeAliveCore from '../index';

@IDataboxApiStatics
export default class DataboxApi {
  static getOutput(
    args: Parameters<IDataboxApi['getOutput']>[0],
  ): ReturnType<IDataboxApi['getOutput']> {
    const sessionObserver = getObserver(args);
    return sessionObserver.getDataboxEvent();
  }

  static getCollectedAssets(
    args: Parameters<IDataboxApi['getCollectedAssets']>[0],
  ): ReturnType<IDataboxApi['getCollectedAssets']> {
    const sessionObserver = getObserver(args);
    return sessionObserver.getCollectedAssets();
  }

  static async execExtract(args: IHeroSessionArgs): Promise<{
    success: boolean;
    error?: Error;
  }> {
    const observer = getObserver(args);

    const error = await observer.relaunchSession('extraction');

    return {
      success: !error,
      error,
    };
  }
}

function getObserver(args?: IHeroSessionArgs): SessionObserver {
  const sessionId = args?.heroSessionId ?? ChromeAliveCore.activeHeroSessionId;
  if (!sessionId || !ChromeAliveCore.sessionObserversById.has(sessionId))
    throw new Error(`No active session found - sessionId: "${sessionId}"`);

  return ChromeAliveCore.sessionObserversById.get(sessionId);
}

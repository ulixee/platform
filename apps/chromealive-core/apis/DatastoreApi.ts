import { IHeroSessionArgs } from '@ulixee/apps-chromealive-interfaces/apis/ISessionApi';
import IDatastoreApi, {
  IDatastoreApiStatics,
} from '@ulixee/apps-chromealive-interfaces/apis/IDatastoreApi';
import SessionObserver from '../lib/SessionObserver';
import ChromeAliveCore from '../index';

@IDatastoreApiStatics
export default class DatastoreApi {
  static getOutput(
    args: Parameters<IDatastoreApi['getOutput']>[0],
  ): ReturnType<IDatastoreApi['getOutput']> {
    const sessionObserver = getObserver(args);
    return sessionObserver.getDatastoreEvent();
  }

  static getCollectedAssets(
    args: Parameters<IDatastoreApi['getCollectedAssets']>[0],
  ): ReturnType<IDatastoreApi['getCollectedAssets']> {
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

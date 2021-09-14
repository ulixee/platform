import { ISessionQuitArgs } from '@ulixee/apps-chromealive-interfaces/apis/ISessionQuitApi';
import ChromeAliveCore from '../index';

export default async function quitSessionApi(args: ISessionQuitArgs): Promise<void> {
  const sessionId = args.heroSessionId ?? ChromeAliveCore.activeHeroSessionId;
  if (!sessionId || !ChromeAliveCore.sessionObserversById.has(sessionId))
    throw new Error('No active sessionId found');

  const session = ChromeAliveCore.sessionObserversById.get(sessionId);
  await session.heroSession.close(true);
}

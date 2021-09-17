import { ISessionReplayArgs } from '@ulixee/apps-chromealive-interfaces/apis/ISessionReplayApi';
import ChromeAliveCore from '../index';

export default async function replaySessionApi(args: ISessionReplayArgs): Promise<void> {
  const sessionId = args.heroSessionId ?? ChromeAliveCore.activeHeroSessionId;
  if (!sessionId || !ChromeAliveCore.sessionObserversById.has(sessionId))
    throw new Error(`No active session found - sessionId: "${sessionId}"`);

  const replay = ChromeAliveCore.sessionObserversById.get(sessionId)?.replayManager;
  if (args.percentOffset >= 100) {
    await replay.close();
  } else if (!replay.isOpen) {
    await replay.open(args.percentOffset ?? 100);
  } else {
    await replay.setOffset(args.percentOffset ?? 100);
  }
}

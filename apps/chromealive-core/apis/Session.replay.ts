import {
  ISessionReplayArgs,
  ISessionReplayResult,
} from '@ulixee/apps-chromealive-interfaces/apis/ISessionReplayApi';
import ChromeAliveCore from '../index';

export default async function replaySessionApi(
  args: ISessionReplayArgs,
): Promise<ISessionReplayResult> {
  const sessionId = args.heroSessionId ?? ChromeAliveCore.activeHeroSessionId;
  if (!sessionId || !ChromeAliveCore.sessionObserversById.has(sessionId))
    throw new Error(`No active session found - sessionId: "${sessionId}"`);

  const sessionObserver = ChromeAliveCore.sessionObserversById.get(sessionId);

  let timelineOffsetPercent = args.percentOffset ?? 100;
  if (args.step) {
    timelineOffsetPercent = await sessionObserver.replayStep(args.step);
  } else {
    await sessionObserver.replayGoto(timelineOffsetPercent);
  }
  return { timelineOffsetPercent };
}

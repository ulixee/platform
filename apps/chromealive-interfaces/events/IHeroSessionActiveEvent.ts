import ITimelineMetadata from '@ulixee/hero-interfaces/ITimelineMetadata';
import IAppModeEvent from './IAppModeEvent';

export default interface IHeroSessionActiveEvent {
  scriptEntrypoint: string;
  startTime: number;
  endTime?: number;
  scriptLastModifiedTime: number;
  heroSessionId: string;
  mode: IAppModeEvent['mode'];
  inputBytes: number;
  playbackState: 'running' | 'paused';  // paused = done
  run: number;
  runtimeMs: number;
  worldHeroSessionIds: string[];
  timeline: ITimelineMetadata;
}

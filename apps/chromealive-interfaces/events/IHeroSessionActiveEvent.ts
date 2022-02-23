import ITimelineMetadata from '@ulixee/hero-interfaces/ITimelineMetadata';
import IAppModeEvent from './IAppModeEvent';

export default interface IHeroSessionActiveEvent {
  scriptEntrypoint: string;
  scriptLastModifiedTime: number;
  heroSessionId: string;
  hasWarning: boolean;
  mode: IAppModeEvent['mode'];
  playbackState: 'running' | 'paused';  // paused = done
  run: number;
  runtimeMs: number;
  domStates: {
    id: string;
    name: string;
    offsetPercent: number;
    didMatch: boolean;
    inProgress: boolean;
  }[];
  worldHeroSessionIds: string[];
  timeline: ITimelineMetadata;
}

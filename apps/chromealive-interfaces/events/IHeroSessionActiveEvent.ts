import ITimelineMetadata from '@ulixee/hero-interfaces/ITimelineMetadata';
import IAppModeEvent from './IAppModeEvent';

export default interface IHeroSessionActiveEvent {
  scriptEntrypoint: string;
  scriptLastModifiedTime: number;
  heroSessionId: string;
  hasWarning: boolean;
  mode: IAppModeEvent['mode'];
  playbackState: 'running' | 'paused';
  run: number;
  runtimeMs: number;
  pageStateIdNeedsResolution: string;
  pageStates: {
    id: string;
    offsetPercent: number;
    isUnresolved: boolean;
    resolvedState: string;
  }[];
  worldHeroSessionIds: string[];
  timeline: ITimelineMetadata;
}

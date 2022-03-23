import ITimelineMetadata from '@ulixee/hero-interfaces/ITimelineMetadata';

export default interface IHeroSessionActiveEvent {
  scriptEntrypoint: string;
  scriptEntrypointTs?: string;
  startTime: number;
  endTime?: number;
  scriptLastModifiedTime: number;
  heroSessionId: string;
  inputBytes: number;
  playbackState: 'running' | 'paused' | 'finished';
  runtimeMs: number;
  timeline: ITimelineMetadata;
}

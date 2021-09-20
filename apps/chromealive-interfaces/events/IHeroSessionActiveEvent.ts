export default interface IHeroSessionActiveEvent {
  scriptEntrypoint: string;
  scriptLastModifiedTime: number;
  heroSessionId: string;
  hasWarning: boolean;
  playbackState: 'live' | 'paused' | 'history';
  runtimeMs: number;
  run: number;
  // don't group by tabid/frameid for now
  paintEvents: {
    offsetPercent: number;
    domChanges: number;
  }[];
  urls: {
    tabId: number;
    navigationId: number;
    url: string;
    offsetPercent: number;
    loadStatusOffsets: {
      status: string;
      offsetPercent: number;
    }[];
  }[];
  screenshots: {
    timestamp: number;
    offsetPercent: number;
    tabId: number;
  }[];
}

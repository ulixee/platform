export default interface IHeroSessionActiveEvent {
  scriptEntrypoint: string;
  scriptLastModifiedTime: number;
  heroSessionId: string;
  hasWarning: boolean;
  state: 'play' | 'paused';
  durationSeconds: number;
  run: number;
  isReplaying: boolean;
  loadedUrls: {
    url: string;
    offsetPercent: number;
    navigationId: number;
    tabId: number;
    hasScreenshot: boolean;
  }[];
}

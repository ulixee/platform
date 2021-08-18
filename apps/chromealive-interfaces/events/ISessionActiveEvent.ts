export default interface ISessionActiveEvent {
  scriptEntrypoint: string;
  scriptLastModifiedTime: number;
  heroSessionId: string;
  hasWarning: boolean;
  state: 'play' | 'paused';
  durationSeconds: number;
  input: any;
  inputBytes: number;
  outputBytes: number;
  run: number;
  loadedUrls: {
    url: string;
    offsetPercent: number;
    navigationId: number;
    tabId: number;
    hasScreenshot: boolean;
  }[];
}

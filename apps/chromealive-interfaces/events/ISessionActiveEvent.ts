export default interface ISessionActiveEvent {
  scriptEntrypoint: string;
  scriptLastModifiedTime: number;
  sessionId: string;
  hasWarning: boolean;
  state: 'play' | 'paused';
  durationSeconds: number;
  inputKb: number;
  outputKb: number;
  run: number;
  ticks: {
    url: string;
    offsetPercent: number;
    navigationId: number;
    tabId: number;
    screenshotUrl: string;
  }[];
}

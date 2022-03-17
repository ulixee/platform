export default interface IDomStateApi {
  load(args: { domStateId: string }): Promise<void>;
  exit(): Promise<void>;
  unfocusSession(): Promise<void>;
  spawnSession(): Promise<void>;
  openSession(args: { heroSessionId: string }): Promise<void>;
  modifySessionTimes(args: {
    heroSessionId: string;
    timelineOffset: number;
    isStartTime: boolean;
  }): Promise<void>;
  focusSessionTime(args: { heroSessionId: string; isStartTime: boolean }): Promise<void>;
  extendSessionTime(args: { heroSessionId: string; addMillis: number }): Promise<void>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function IDomStateApiStatics(staticClass: IDomStateApi) {}

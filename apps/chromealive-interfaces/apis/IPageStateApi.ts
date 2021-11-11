export default interface IPageStateApi {
  load(args: { pageStateId: string }): Promise<void>;
  exit(): Promise<void>;
  renameState(args: { state: string; oldValue: string }): void;
  addState(args: { heroSessionIds: string[]; state: string }): void;
  spawnSession(): Promise<void>;
  removeState(args: { state: string }): void;
  unfocusSession(): void;
  openSession(args: { heroSessionId: string }): Promise<void>;
  modifySessionTimes(args: {
    heroSessionId: string;
    timelineOffset: number;
    isStartTime: boolean;
  }): Promise<void>;
  focusSessionTime(args: { heroSessionId: string; isStartTime: boolean }): Promise<void>;
  save(): Promise<{
    needsCodeChange: boolean;
    code: string;
  }>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function IPageStateApiStatics(constructor: IPageStateApi) {}

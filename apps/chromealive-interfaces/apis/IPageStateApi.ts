export default interface IPageStateApi {
  load(args: { pageStateId: string }): Promise<void>;
  exit(): Promise<void>;
  addState(args: { heroSessionIds: string[]; state: string }): void;
  removeState(args: { state: string }): void;
  openSession(args: { heroSessionId: string }): Promise<void>;
  modifySessionTimes(args: {
    heroSessionId: string;
    timelineOffset: number;
    isStartTime: boolean;
  }): Promise<void>;
  save(): Promise<{
    needsCodeChange: boolean;
    code: string;
  }>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function IPageStateApiStatics(constructor: IPageStateApi) {}

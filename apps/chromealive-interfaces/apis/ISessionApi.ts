import ISessionCreateOptions from '@ulixee/hero-interfaces/ISessionCreateOptions';

export interface ISessionResumeArgs extends IHeroSessionArgs {
  startLocation: ISessionCreateOptions['sessionResume']['startLocation'];
  startFromNavigationId?: number;
}

export interface IHeroSessionArgs {
  heroSessionId: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ISessionApiStatics(constructor: ISessionApi) {}

export default interface ISessionApi {
  getScreenshot(
    args: IHeroSessionArgs & {
      tabId: number;
      timestamp: number;
    },
  ): {
    imageBase64: string;
  };
  quit(args: IHeroSessionArgs): Promise<void>;
  timetravel(
    args: IHeroSessionArgs & {
      percentOffset?: number;
      step?: 'forward' | 'back';
    },
  ): Promise<{
    timelineOffsetPercent: number;
  }>;
  step(args: IHeroSessionArgs): void;
  resume(args: ISessionResumeArgs): {
    success: boolean;
    error?: Error;
  };
}

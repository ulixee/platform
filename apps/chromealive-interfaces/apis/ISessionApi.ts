import type { IDomRecording } from '@ulixee/hero-core/models/DomChangesTable';
import ISessionCreateOptions from '@ulixee/hero-interfaces/ISessionCreateOptions';
import ICommandUpdatedEvent from '../events/ICommandUpdatedEvent';

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
  getDom(args?: IHeroSessionArgs): Promise<
    IDomRecording & {
      framesById: { [id: number]: { parentId: number; domNodeId: number } };
    }
  >;
  getScriptState(args?: IHeroSessionArgs & { tabId?: number }): Promise<{
    commandsById: Record<number, ICommandUpdatedEvent>;
    sourceFileLines: Record<string, string[]>;
  }>;
  quit(args: IHeroSessionArgs): Promise<void>;
  timetravel(
    args: IHeroSessionArgs & {
      percentOffset?: number;
      step?: 'forward' | 'back';
    },
  ): Promise<{
    timelineOffsetPercent: number;
  }>;
  openPanel(
    args: IHeroSessionArgs & {
      panel: 'Output' | 'Input' | 'Tested';
    },
  ): void;
  step(args: IHeroSessionArgs): void;
  resume(args: ISessionResumeArgs): Promise<{
    success: boolean;
    error?: Error;
  }>;
}

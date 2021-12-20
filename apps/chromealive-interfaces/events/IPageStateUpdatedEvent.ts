import ITimelineMetadata from '@ulixee/hero-interfaces/ITimelineMetadata';
import { IAssertionCounts } from '@ulixee/hero-interfaces/IPageStateAssertionBatch';

export default interface IPageStateUpdatedEvent {
  id: string;
  name: string;
  needsCodeChange: boolean;
  states: {
    state: string;
    heroSessionIds: string[];
    assertionCounts: IAssertionCounts;
  }[];
  heroSessions: {
    id: string;
    isFocused: boolean;
    needsAssignment: boolean;
    isRunning: boolean;
    isPrimary: boolean;
    isSpawnedWorld: boolean;
    assertionCounts: IAssertionCounts;
    timelineRange?: [start: number, end: number];
    loadingRange?: [start: number, end: number];
    timelineOffsetPercents?: [start: number, end: number];
    timeline: ITimelineMetadata;
  }[];
}

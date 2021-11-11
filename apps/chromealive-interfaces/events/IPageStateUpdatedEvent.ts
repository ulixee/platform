import ITimelineMetadata from '@ulixee/hero-interfaces/ITimelineMetadata';
import { IAssertionCounts } from '@ulixee/hero-interfaces/IPageStateAssertionBatch';

export default interface IPageStateUpdatedEvent {
  id: string;
  needsCodeChange: boolean;
  states: {
    state: string;
    heroSessionIds: string[];
    assertionCounts: IAssertionCounts;
  }[];
  unresolvedHeroSessionIds: string[];
  focusedHeroSessionId?: string;
  heroSessions: {
    id: string;
    assertionCounts: IAssertionCounts;
    timelineRange?: [start: number, end: number];
    loadingRange?: [start: number, end: number];
    timelineOffsetPercents?: [start: number, end: number];
    timeline: ITimelineMetadata;
  }[];
}

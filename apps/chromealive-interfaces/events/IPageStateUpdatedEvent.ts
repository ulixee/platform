import ITimelineMetadata from '@ulixee/hero-interfaces/ITimelineMetadata';

export default interface IPageStateUpdateEvent {
  needsCodeChange: boolean;
  states: { state: string; heroSessionIds: string[]; assertionCount: number }[];
  unresolvedHeroSessionIds: string[];
  focusedHeroSessionId?: string;
  heroSessions: {
    id: string;
    assertionCount?: number;
    timelineRange?: [start: number, end: number];
    loadingRange?: [start: number, end: number];
    timeline: ITimelineMetadata;
  }[];
}

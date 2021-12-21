import TimelineBuilder from '@ulixee/hero-timetravel/lib/TimelineBuilder';
import { Session as HeroSession, Tab } from '@ulixee/hero-core';
import FrameNavigations, { IFrameNavigationEvents } from '@ulixee/hero-core/lib/FrameNavigations';
import { LoadStatus } from '@ulixee/hero-interfaces/Location';
import ITimelineMetadata from '@ulixee/hero-interfaces/ITimelineMetadata';
import PageStateGenerator, {
  IPageStateSession,
} from '@ulixee/hero-timetravel/lib/PageStateGenerator';
import SessionDb from '@ulixee/hero-core/dbs/SessionDb';
import PageStateListener, { IPageStateEvents } from '@ulixee/hero-core/lib/PageStateListener';
import {
  addEventListener,
  removeEventListeners,
  TypedEventEmitter,
} from '@ulixee/commons/lib/eventUtils';
import IRegisteredEventListener from '@ulixee/commons/interfaces/IRegisteredEventListener';
import TimelineRecorder from '@ulixee/hero-timetravel/lib/TimelineRecorder';

export default class PageStateSessionTimeline extends TypedEventEmitter<{
  'updated-generator': { pageStateId: string };
  'timeline-change': { pageStateId: string; timelineRange: [number, number] };
}> {
  public defaultWaitMilliseconds = 5e3;

  public get lastMetadata(): ITimelineMetadata {
    return this.timelineBuilder.lastMetadata;
  }

  public get sessionId(): string {
    return this.db.sessionId;
  }

  public heroSession?: HeroSession;
  public timelineBuilder: TimelineBuilder;

  private eventRegistrations: IRegisteredEventListener[] = [];
  private timelineRecorder: TimelineRecorder;

  constructor(
    readonly db: SessionDb,
    readonly pageStateId: string,
    private readonly pageStateGenerator: PageStateGenerator,
    timelineRange?: TimelineBuilder['timelineRange'],
  ) {
    super();
    this.timelineBuilder = new TimelineBuilder({ db, timelineRange });
  }

  public trackSession(heroSession: HeroSession, timelineRecorder: TimelineRecorder): void {
    this.heroSession = heroSession;
    this.timelineBuilder = new TimelineBuilder({ liveSession: heroSession });
    this.timelineRecorder = timelineRecorder;
  }

  public changeLoadingRangeBoundary(offsetPercent: number, isStartTime: boolean): number {
    const timestamp = this.getTimestampForOffset(offsetPercent);
    const generatorSession = this.getGeneratorSession();

    const index = isStartTime ? 0 : 1;
    generatorSession.loadingRange[index] = timestamp;
    generatorSession.needsProcessing = true;
    return timestamp;
  }

  public extendTimelineRange(millis: number): [number, number] {
    const timelineRange = this.timelineBuilder.timelineRange;

    const endTime = timelineRange[1] + millis;
    const timeRange: [number, number] = [timelineRange[0], endTime];
    this.changeTimelineRange(timeRange);
    return timeRange;
  }

  public onNewPageState(
    tab: Tab,
    listener: PageStateListener,
  ): { loadingRange: [number, number]; timelineRange: [number, number] } {
    const statusChangeRegistration = addEventListener(
      tab.navigations,
      'status-change',
      this.onTabNavigationStatusChange.bind(this, tab),
    );
    const pageStateResolvedRegistration = addEventListener(
      listener,
      'resolved',
      this.onPageStateResolved.bind(this, tab, statusChangeRegistration.handler),
    );
    this.eventRegistrations.push(statusChangeRegistration, pageStateResolvedRegistration);

    const { loadingRange, timelineRange } = this.createPageStateTimelines(
      listener,
      tab.navigations,
      tab.sessionId,
    );

    this.timelineBuilder.timelineRange = [...timelineRange];

    if (this.timelineRecorder) {
      this.updateRecordUntilTime(timelineRange[1], true);
    }

    return {
      loadingRange: [...loadingRange],
      timelineRange: [...timelineRange],
    };
  }

  public close(): void {
    removeEventListeners(this.eventRegistrations);
    this.eventRegistrations.length = 0;
  }

  public getTimestampForOffset(offset: number): number {
    return this.timelineBuilder.commandTimeline.getTimestampForOffset(offset);
  }

  public getTimelineOffset(timestamp: number): number {
    return this.timelineBuilder.commandTimeline.getTimelineOffsetForTimestamp(timestamp);
  }

  public getTimelineOffsets(timeRange: [number, number]): [number, number] {
    const [loadStart, loadEnd] = timeRange;
    return [this.getTimelineOffset(loadStart), this.getTimelineOffset(loadEnd)];
  }

  public refreshMetadata(): ITimelineMetadata {
    return this.timelineBuilder.refreshMetadata();
  }

  private getGeneratorSession(): IPageStateSession {
    return this.pageStateGenerator.sessionsById?.get(this.sessionId);
  }

  private onPageStateResolved(
    tab: Tab,
    statusChangeListener: (ev: IFrameNavigationEvents['status-change']) => void,
    resolution: IPageStateEvents['resolved'],
  ) {
    // keep going if we run into an error?
    if (resolution.error) return;
    tab.navigations.off('status-change', statusChangeListener);

    const generatorSession = this.getGeneratorSession();
    generatorSession.loadingRange[1] = Date.now();
    generatorSession.needsProcessing = true;
  }

  private changeTimelineRange(timeRange: [number, number]) {
    const generatorSession = this.getGeneratorSession();
    if (generatorSession.timelineRange?.toString() === timeRange.toString()) return;

    generatorSession.timelineRange = [...timeRange];
    generatorSession.needsProcessing = true;
    this.timelineBuilder.timelineRange = [...timeRange];

    this.updateRecordUntilTime(timeRange[1], true);
    this.emit('timeline-change', {
      pageStateId: this.pageStateId,
      timelineRange: [...timeRange],
    });
  }

  private onTabNavigationStatusChange(
    tab: Tab,
    event: IFrameNavigationEvents['status-change'],
  ): void {
    const generatorSession = this.getGeneratorSession();
    const { loadingRange, timelineRange } = generatorSession;
    const loadStatus = event.newStatus;
    const timestamp = event.statusChanges[event.newStatus];

    let hasLoadingRangeChanges = false;
    if (loadStatus === LoadStatus.HttpResponded && timestamp > loadingRange[0]) {
      loadingRange[0] = timestamp;
      hasLoadingRangeChanges = true;
    }

    if (
      loadStatus === LoadStatus.DomContentLoaded &&
      // after loadingRange start
      timestamp > loadingRange[0] &&
      timestamp !== loadingRange[1]
    ) {
      loadingRange[1] = timestamp;
      hasLoadingRangeChanges = true;
    }
    if (hasLoadingRangeChanges) {
      generatorSession.needsProcessing = true;
      this.emit('updated-generator', { pageStateId: this.pageStateId });
    }

    // don't update for Dom Content Loaded past range
    if (loadStatus === LoadStatus.DomContentLoaded && timestamp < timelineRange[1]) {
      return;
    }

    if (
      loadStatus === LoadStatus.AllContentLoaded ||
      loadStatus === LoadStatus.DomContentLoaded ||
      loadStatus === LoadStatus.PaintingStable
    ) {
      const newEndDate = timestamp + 500;
      if (newEndDate > timelineRange[1]) {
        this.changeTimelineRange([timelineRange[0], newEndDate]);
      }
    }
  }

  private getDefaultTimelineMillis(excludeSessionId: string): number {
    for (const [id, session] of this.pageStateGenerator.sessionsById) {
      if (id !== excludeSessionId) {
        const timelineMillis = session.timelineRange[1] - session.timelineRange[0];
        if (timelineMillis > this.defaultWaitMilliseconds) {
          return timelineMillis;
        }
      }
    }
    return this.defaultWaitMilliseconds;
  }

  private createPageStateTimelines(
    listener: PageStateListener,
    navigations: FrameNavigations,
    sessionId: string,
  ): { loadingRange: [number, number]; timelineRange: [number, number] } {
    const timelineMillis = this.getDefaultTimelineMillis(sessionId);
    let loadingStartTime = listener.startTime;
    let loadingEndTime = Date.now() + timelineMillis;

    const firstNav = navigations.history
      .find(x => x.statusChanges.get(LoadStatus.HttpRequested) > loadingStartTime)
      ?.statusChanges?.get(LoadStatus.HttpRequested);
    if (firstNav && firstNav > loadingStartTime) {
      loadingStartTime = firstNav;
    }

    const lastNav = navigations.getLastLoadedNavigation();
    const domContentLoaded = lastNav.statusChanges.get(LoadStatus.DomContentLoaded);
    if (domContentLoaded > loadingEndTime) {
      loadingEndTime = domContentLoaded;
    }

    let timelineEnd = loadingEndTime;
    const loaded = lastNav.statusChanges.get(LoadStatus.AllContentLoaded);
    if (loaded > timelineEnd) {
      timelineEnd = loaded;
    }

    return {
      loadingRange: [loadingStartTime, loadingEndTime],
      timelineRange: [listener.startTime, timelineEnd],
    };
  }

  private updateRecordUntilTime(recordUntilTime: number, recordUntilLoad: boolean) {
    if (recordUntilTime > Date.now())
      this.timelineRecorder.recordScreenUntilTime = Math.max(
        recordUntilTime,
        this.timelineRecorder.recordScreenUntilTime ?? 0,
      );
    this.timelineRecorder.recordScreenUntilLoad = recordUntilLoad;
  }
}

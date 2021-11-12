import TimelineBuilder from '@ulixee/hero-timetravel/player/TimelineBuilder';
import { Session as HeroSession, Tab } from '@ulixee/hero-core';
import { IFrameNavigationEvents } from '@ulixee/hero-core/lib/FrameNavigations';
import { LoadStatus } from '@ulixee/hero-interfaces/Location';
import ITimelineMetadata from '@ulixee/hero-interfaces/ITimelineMetadata';
import PageStateGenerator, {
  IPageStateSession,
} from '@ulixee/hero-timetravel/lib/PageStateGenerator';
import SessionDb from '@ulixee/hero-core/dbs/SessionDb';
import PageStateListener, { IPageStateEvents } from '@ulixee/hero-core/lib/PageStateListener';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';

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

  constructor(
    readonly db: SessionDb,
    private readonly generatorsByPageStateId: Map<string, { generator: PageStateGenerator }>,
    public readonly timelineBuilder?: TimelineBuilder,
  ) {
    super();
    this.timelineBuilder ??= new TimelineBuilder(db);
  }

  public trackSession(heroSession: HeroSession): void {
    this.heroSession = heroSession;
    this.timelineBuilder.trackLiveSession(heroSession);
  }

  public changeLoadingRangeBoundary(
    pageStateId: string,
    offsetPercent: number,
    isStartTime: boolean,
  ): number {
    console.log(
      'changing loading range',
      offsetPercent,
      this.timelineBuilder.commandTimeline.getTimestampForOffset(offsetPercent),
      this.timelineBuilder.timelineRange,
    );
    const timestamp = this.getTimestampForOffset(offsetPercent);
    const generatorSession = this.getGeneratorSession(pageStateId);

    const index = isStartTime ? 0 : 1;
    generatorSession.loadingRange[index] = timestamp;
    generatorSession.needsProcessing = true;
    return timestamp;
  }

  public extendTimelineRange(pageStateId: string, millis: number): [number, number] {
    const timelineRange = this.timelineBuilder.timelineRange;

    const endTime = timelineRange[1] + millis;
    const timeRange: [number, number] = [timelineRange[0], endTime];
    this.changeTimelineRange(pageStateId, timeRange);
    return timeRange;
  }

  public onNewPageState(tab: Tab, listener: PageStateListener): void {
    const pageStateId = listener.id;
    const statusChangeCb = this.onTabNavigationStatusChange.bind(this, tab, pageStateId);
    tab.navigations.on('status-change', statusChangeCb);
    listener.on('resolved', this.onPageStateResolved.bind(this, tab, statusChangeCb));
    this.timelineBuilder.recordScreenUntilLoad = true;

    const generatorSession = this.getGeneratorSession(pageStateId);
    let endTime = generatorSession.loadingRange[1];

    const lastNav = tab.navigations.getLastLoadedNavigation();
    const loaded = lastNav.statusChanges.get(LoadStatus.AllContentLoaded);
    if (loaded > endTime) {
      endTime = loaded;
    }

    this.changeTimelineRange(pageStateId, [listener.startTime, endTime]);
  }

  public getNewPageStateLoadingRange(tab: Tab, listener: PageStateListener): [number, number] {
    const pageStateId = listener.id;
    const timelineMillis = this.getDefaultTimelineMillis(pageStateId, tab.sessionId);
    let startTime = listener.startTime;
    let endTime = startTime + timelineMillis;

    const firstNav = tab.navigations.history
      .find(x => x.statusChanges.get(LoadStatus.HttpRequested) > startTime)
      ?.statusChanges?.get(LoadStatus.HttpRequested);
    if (firstNav && firstNav > startTime) startTime = firstNav;

    const lastNav = tab.navigations.getLastLoadedNavigation();
    const domContentLoaded = lastNav.statusChanges.get(LoadStatus.DomContentLoaded);
    if (domContentLoaded > endTime) {
      endTime = domContentLoaded;
    }

    return [startTime, endTime];
  }

  public close(): void {
    if (!this.heroSession) TimelineBuilder.bySessionId.delete(this.sessionId);
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

  private getGeneratorSession(pageStateId: string): IPageStateSession {
    return this.generatorsByPageStateId
      .get(pageStateId)
      ?.generator?.sessionsById?.get(this.sessionId);
  }

  private onPageStateResolved(
    tab: Tab,
    statusChangeListener: (ev: IFrameNavigationEvents['status-change']) => void,
    resolution: IPageStateEvents['resolved'],
  ) {
    // keep going if we run into an error?
    if (resolution.error) return;
    tab.navigations.off('status-change', statusChangeListener);
    this.timelineBuilder.recordScreenUntilLoad = false;
  }

  private changeTimelineRange(pageStateId: string, timeRange: [number, number]) {
    const generatorSession = this.getGeneratorSession(pageStateId);
    if (generatorSession.timelineRange?.toString() === timeRange.toString()) return;

    generatorSession.timelineRange = [...timeRange];
    generatorSession.needsProcessing = true;
    this.timelineBuilder.timelineRange = [...timeRange];

    const endTime = timeRange[1];
    if (endTime > Date.now()) {
      this.timelineBuilder.recordScreenUntilTime = endTime;
    }
    this.emit('timeline-change', {
      pageStateId,
      timelineRange: [...timeRange],
    });
  }

  private onTabNavigationStatusChange(
    tab: Tab,
    pageStateId: string,
    event: IFrameNavigationEvents['status-change'],
  ): void {
    const generatorSession = this.getGeneratorSession(pageStateId);
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
      this.emit('updated-generator', { pageStateId });
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
      this.changeTimelineRange(pageStateId, [timelineRange[0], timestamp + 500]);
    }
  }

  private getDefaultTimelineMillis(pageStateId: string, excludeSessionId: string): number {
    const generator = this.generatorsByPageStateId.get(pageStateId).generator;
    for (const [id, session] of generator.sessionsById) {
      if (id !== excludeSessionId) {
        const timelineMillis = session.timelineRange[1] - session.timelineRange[0];
        if (timelineMillis > this.defaultWaitMilliseconds) {
          return timelineMillis;
        }
      }
    }
    return this.defaultWaitMilliseconds;
  }
}

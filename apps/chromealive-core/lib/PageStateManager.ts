import PageStateGenerator, {
  IPageStateGeneratorAssertionBatch,
} from '@ulixee/hero-timetravel/lib/PageStateGenerator';
import { Session as HeroSession, Tab } from '@ulixee/hero-core';
import { fork } from 'child_process';
import Log from '@ulixee/commons/lib/Logger';
import { ITabEventParams } from '@ulixee/hero-core/lib/Tab';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import * as Fs from 'fs';
import * as Path from 'path';
import { IPageStateEvents } from '@ulixee/hero-core/lib/PageStateListener';
import { bindFunctions } from '@ulixee/commons/lib/utils';
import SessionObserver from './SessionObserver';
import CommandTimeline from '@ulixee/hero-timetravel/lib/CommandTimeline';
import IPuppetContext from '@ulixee/hero-interfaces/IPuppetContext';
import ICorePlugin from '@ulixee/hero-interfaces/ICorePlugin';
import IPageStateUpdateEvent from '@ulixee/apps-chromealive-interfaces/events/IPageStateUpdatedEvent';
import Timeline from '@ulixee/hero-timetravel/player/Timeline';

const { log } = Log(module);

export default class PageStateManager extends TypedEventEmitter<{
  updated: IPageStateUpdateEvent;
  unresolved: { pageStateId: string; heroSessionId: string; error?: Error };
}> {
  public get generator(): PageStateGenerator {
    return this.generatorsById.get(this.activePageStateId);
  }

  public get activeTimeline(): Timeline {
    return this.timelinesByHeroSessionId.get(this.activeTimelineHeroSessionId);
  }

  public defaultWaitMilliseconds = 5e3;

  private readonly pageStateMetaById = new Map<
    string,
    { startingStates: string; needsCodeChange: boolean }
  >();

  private readonly generatorsById = new Map<string, PageStateGenerator>();
  private readonly heroSessionsById = new Map<string, HeroSession>();
  private readonly timelinesByHeroSessionId = new Map<string, Timeline>();

  private activePageStateId: string;
  private activeTimelineHeroSessionId: string;

  private readonly timetravelBrowserContext: IPuppetContext;
  private readonly timetravelPlugins: ICorePlugin[];
  private readonly scriptEntrypoint: string;

  constructor(readonly sessionObserver: SessionObserver) {
    super();

    bindFunctions(this);
    const sourceHeroSession = sessionObserver.heroSession;
    this.timetravelBrowserContext = sourceHeroSession.browserContext;
    this.timetravelPlugins = sourceHeroSession.plugins.corePlugins;
    this.scriptEntrypoint = sourceHeroSession.options.scriptInstanceMeta.entrypoint;
    this.logger = log.createChild(module, {
      sessionId: sourceHeroSession.id,
    });
    this.trackHeroSession(sourceHeroSession);
  }

  public async save(): Promise<{ code: string; needsCodeChange: boolean }> {
    let code = `tab.waitForPageState({`;
    const id = this.activePageStateId;

    const { needsCodeChange } = this.pageStateMetaById.get(id);

    await Fs.promises.mkdir(`@/pagestate/${id}`, { recursive: true });
    for (const state of this.generator.statesByName.keys()) {
      const exported = this.generator.export(state);
      const path = Path.normalize(`@/pagestate/${id}/${state}.json`);
      await Fs.promises.writeFile(path, JSON.stringify(exported));
      code += `\n  ${JSON.stringify(state)}: ({ loadFrom }) => loadFrom(${JSON.stringify(path)}),`;
    }

    code += `\n});`;

    return { needsCodeChange, code };
  }

  public async close(): Promise<void> {
    for (const generator of this.generatorsById.values()) {
      await generator.close();
    }

    await this.closeTimetravel();

    await this.sessionObserver.updateTabGroup(false);
  }

  public destroy(): void {
    this.generatorsById.clear();
  }

  public addMultiverse(): void {
    const execArgv = [];

    if (this.scriptEntrypoint.endsWith('.ts')) {
      execArgv.push('-r', 'ts-node/register');
    }

    try {
      fork(this.scriptEntrypoint, execArgv, {
        stdio: 'inherit',
        env: { ...process.env, HERO_CLI_NOPROMPT: 'true', mode: 'multiverse' },
      });
    } catch (error) {
      this.logger.error('ERROR running multiverse', { error });
    }
  }

  public onMultiverseSession(heroSession: HeroSession) {
    // might not be our session
    if (heroSession.options.scriptInstanceMeta.entrypoint !== this.scriptEntrypoint) {
      return;
    }
    heroSession.configureHeaded({ showBrowser: false });
    heroSession.options.sessionKeepAlive = false;
    heroSession.options.sessionResume = null;
    this.trackHeroSession(heroSession);
    if (this.activePageStateId) this.publish();
  }

  public async loadPageState(id: string): Promise<void> {
    this.activePageStateId = id;
    await this.sessionObserver.updateTabGroup(true, this.close);
    this.publish();
  }

  public async changeSessionTimeBoundary(
    percentOffset: number,
    isStartTime: boolean,
  ): Promise<void> {
    const playback = await this.activeTimeline.goto(percentOffset);
    const focusedSessionId = this.activeTimeline.sessionId;
    const existingGeneratorSession = this.generator.sessionsById.get(focusedSessionId);

    const timestamp = playback.currentTick.timestamp;
    if (isStartTime) {
      existingGeneratorSession.loadingRange[0] = timestamp;
    } else {
      existingGeneratorSession.loadingRange[1] = timestamp;
    }
    existingGeneratorSession.needsResultsVerification = true;
    this.updateState();
  }

  public addState(name: string, ...heroSessionIds: string[]): void {
    this.generator.addState(name, ...heroSessionIds);
    this.updateCodeChangeFlag(this.activePageStateId);
    this.updateState();
  }

  public removeState(name: string): void {
    const existing = this.generator.statesByName.get(name);
    if (!existing) return;
    this.generator.statesByName.delete(name);
    this.updateCodeChangeFlag(this.activePageStateId);
    this.updateState();
  }

  public isShowingSession(heroSessionId: string): boolean {
    return this.activeTimeline?.sessionId === heroSessionId;
  }

  public async openTimetravel(heroSessionId: string): Promise<void> {
    if (this.activeTimeline) {
      if (this.activeTimeline.sessionId === heroSessionId) {
        return;
      }
      await this.activeTimeline.closeTabs();
    }

    this.activeTimelineHeroSessionId = heroSessionId;
    this.activeTimeline.once('close', this.onTimetravelClosed);
    await this.activeTimeline.goto(100);
  }

  private async onTimetravelClosed(): Promise<void> {
    await this.closeTimetravel();
    // TODO: show a blank explainer page
  }

  private trackHeroSession(heroSession: HeroSession): void {
    const id = heroSession.id;
    this.heroSessionsById.set(id, heroSession);
    heroSession.on('tab-created', this.onTab);

    const timeline = new Timeline(
      heroSession.db,
      this.timetravelBrowserContext,
      this.timetravelPlugins,
      heroSession,
    );
    timeline.on('open', () => this.sessionObserver.updateTabGroup(true));

    this.timelinesByHeroSessionId.set(id, timeline);
  }

  private async closeTimetravel(): Promise<void> {
    if (!this.activeTimeline) return;
    this.activeTimeline.off('close', this.onTimetravelClosed);
    await this.activeTimeline.closeTabs();
    this.activeTimelineHeroSessionId = null;
  }

  private publish(): void {
    this.emit('updated', this.toEvent());
  }

  private updateState(): void {
    this.generator
      .evaluate()
      .then(() => this.publish())
      .catch(err => this.logger.error('Error updating page state', err));
  }

  private onTab(event: { tab: Tab }) {
    const { tab } = event;
    tab.on('wait-for-pagestate', this.onWaitForPageState.bind(this, tab));
  }

  private onWaitForPageState(tab: Tab, event: ITabEventParams['wait-for-pagestate']) {
    const listener = event.listener;
    const pageStateId = listener.id;
    let generator = this.generatorsById.get(pageStateId);
    if (!generator) {
      generator = new PageStateGenerator();
      this.generatorsById.set(pageStateId, generator);
      this.pageStateMetaById.set(pageStateId, {
        startingStates: listener.states.toString(),
        needsCodeChange: false,
      });
      for (const [id, assertion] of listener.batchAssertionsById) {
        if (id.startsWith('@') && assertion.rawAssertionsData) {
          generator.import(assertion.rawAssertionsData as IPageStateGeneratorAssertionBatch);
        }
      }
    }
    this.activePageStateId ??= pageStateId;

    listener.on('resolved', this.onPageStateResolved.bind(this, pageStateId, tab));

    const startTime = listener.startTime;

    generator.addSession(
      tab.session.db,
      tab.id,
      [startTime, startTime + this.defaultWaitMilliseconds],
      [startTime, startTime + this.defaultWaitMilliseconds],
    );

    if (!listener.states.length) {
      generator.addState('default', tab.sessionId);
    }
  }

  private onPageStateResolved(tab: Tab, pageStateId: string, event: IPageStateEvents['resolved']) {
    if (event.state) {
      const generator = this.generatorsById.get(pageStateId);
      generator.addState(event.state, tab.sessionId);
    } else {
      this.emit('unresolved', {
        heroSessionId: tab.sessionId,
        pageStateId,
        error: event.error,
      });
    }
  }

  private toEvent(): IPageStateUpdateEvent {
    const unassignedSessionIds = new Set(this.heroSessionsById.keys());
    const { needsCodeChange } = this.pageStateMetaById.get(this.activePageStateId);

    const result: IPageStateUpdateEvent = {
      needsCodeChange,
      focusedHeroSessionId: this.activeTimeline?.sessionId,
      states: [],
      unresolvedHeroSessionIds: [],
      heroSessions: [],
    };

    const generator = this.generator;
    if (!generator) return result;

    for (const [state, details] of generator.statesByName) {
      let assertionCount = 0;
      for (const assert of Object.values(details.assertsByFrameId)) {
        assertionCount += Object.keys(assert).length;
      }
      result.states.push({
        state,
        heroSessionIds: [...details.sessionIds],
        assertionCount,
      });
      for (const id of details.sessionIds) unassignedSessionIds.delete(id);
    }
    for (const id of unassignedSessionIds) {
      result.unresolvedHeroSessionIds.push(id);
    }

    for (const id of this.heroSessionsById.keys()) {
      const generatorSession = generator.sessionsById.get(id);
      const timeline = CommandTimeline.fromDb(generatorSession.db);
      const data = Timeline.createTimelineMetadata(timeline, generatorSession.db);
      const assertionCount = generator.sessionAssertions.sessionAssertionsCount(id);
      result.heroSessions.push({
        id,
        timelineRange: generatorSession.timelineRange,
        loadingRange: generatorSession.loadingRange,
        assertionCount,
        timeline: data,
      });
    }
    return result;
  }

  private updateCodeChangeFlag(pageStateId: string): void {
    const meta = this.pageStateMetaById.get(pageStateId);
    const generator = this.generatorsById.get(pageStateId);
    const newStateList = generator.states.toString();
    meta.needsCodeChange = newStateList !== meta.startingStates;
  }
}

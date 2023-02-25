import {
  IHeroSessionsListResult,
  IHeroSessionsSearchResult,
} from '@ulixee/desktop-interfaces/apis/IHeroSessionsApi';
import { Session as HeroSession } from '@ulixee/hero-core';
import * as Fs from 'fs';
import SessionDb from '@ulixee/hero-core/dbs/SessionDb';
import CommandFormatter from '@ulixee/hero-core/lib/CommandFormatter';
import TypeSerializer from '@ulixee/commons/lib/TypeSerializer';
import FuseJs from 'fuse.js';
import { bindFunctions } from '@ulixee/commons/lib/utils';
import EventSubscriber from '@ulixee/commons/lib/EventSubscriber';
import TypedEventEmitter from '@ulixee/commons/lib/TypedEventEmitter';
import OutputRebuilder from './OutputRebuilder';

const Fuse = require('fuse.js/dist/fuse.common.js');

export default class HeroSessionsSearch extends TypedEventEmitter<{
  update: IHeroSessionsListResult[];
}> {
  private sessions: IHeroSessionsListResult[] = [];
  private commandsBySessionId: { [sessionId: string]: { id: number; label: string }[] } = {};

  private searchIndex: FuseJs<{
    id: string;
    commands: { id: number; label: string }[];
    logs: string[];
  }> = new Fuse([], {
    isCaseSensitive: false,
    findAllMatches: true,
    useExtendedSearch: true,
    minMatchCharLength: 3,
    keys: ['commands.label', 'logs'],
    ignoreLocation: true,
    ignoreFieldNorm: true,
    includeMatches: true,
  });

  private hasLoaded = false;
  private events = new EventSubscriber();

  constructor() {
    super();
    bindFunctions(this);
  }

  close(): void {
    this.events.off();
  }

  onNewSession(heroSession: HeroSession): void {
    const id = heroSession.id;
    const entry: IHeroSessionsListResult = {
      heroSessionId: id,
      scriptEntrypoint: this.processEntrypoint(heroSession.options?.scriptInstanceMeta?.entrypoint),
      dbPath: heroSession.db.path,
      startTime: new Date(heroSession.createdTime),
      state: 'running',
      input: heroSession.options.input,
    };
    this.sessions.unshift(entry);
    this.emit('update', [entry]);
    this.events.group(
      id,
      this.events.on(heroSession, 'kept-alive', this.onHeroSessionKeptAlive.bind(this, entry)),
      this.events.on(heroSession, 'resumed', this.onHeroSessionResumed.bind(this, entry)),
      this.events.on(heroSession, 'closed', this.onHeroSessionClosed.bind(this, entry)),
    );
  }

  list(): IHeroSessionsListResult[] {
    if (this.hasLoaded) return this.sessions;

    for (const dbName of Fs.readdirSync(SessionDb.databaseDir)) {
      if (!dbName.endsWith('.db')) continue;
      const session = this.processSession(dbName.replace('.db', ''));

      this.sessions.push(session);
    }
    this.hasLoaded = true;
    return this.sessions;
  }

  search(query: string): IHeroSessionsSearchResult[] {
    const finalQuery: string = query
      .split(/\s+/)
      .map(x => {
        if (!x) return null;
        if (x.match(/['^!.]+/)) return `'"${x}"`;
        return `'${x.trim()}`;
      })
      .filter(Boolean)
      .join(' | ');

    const results: IHeroSessionsSearchResult[] = [];
    const searchResults = this.searchIndex.search(finalQuery);
    for (const result of searchResults) {
      const id = result.item.id;

      const matches: IHeroSessionsSearchResult['matches'] = [];
      for (const match of result.matches) {
        matches.push({ type: 'command', preview: match.value });
      }
      results.push({
        heroSessionId: id,
        matches,
      });
    }
    return results;
  }

  withErrors(): IHeroSessionsListResult[] {
    return this.list().filter(x => x.state === 'error');
  }

  private processSession(sessionId: string): IHeroSessionsListResult {
    const sessionDb = SessionDb.getCached(sessionId);
    const session = sessionDb.session.get();
    // might not be loaded yet
    if (!session) return;
    const { id, createSessionOptions, startDate, closeDate, scriptEntrypoint } = session;
    const outputChanges = sessionDb.output.all();
    const outputRebuilder = new OutputRebuilder();
    outputRebuilder.applyChanges(outputChanges);

    const commands = sessionDb.commands.loadHistory();
    const commandLabels: { id: number; label: string }[] = [];
    let errorOnLastCommand: { id: number; error: Error; label: string };
    let state: IHeroSessionsListResult['state'] = closeDate ? 'complete' : 'running';

    for (const command of commands) {
      const label = CommandFormatter.toString(command);
      commandLabels.push({ id: command.id, label });
      if (command.resultType?.endsWith('Error')) {
        errorOnLastCommand = {
          label,
          error: command.result,
          id: command.id,
        };
      } else if (
        command.name !== 'flush' &&
        command.name !== 'close' &&
        !command.name.includes('Listener')
      ) {
        errorOnLastCommand = null;
      }
      if (state === 'running' && command.name === 'close' && command.args[0] === false) {
        state = 'kept-alive';
      }
    }
    if (errorOnLastCommand) state = 'error';
    this.commandsBySessionId[id] = commandLabels;
    // for (const msg of sessionDb.devtoolsMessages.all()) {
    //   if (
    //     msg.params?.includes(keyword) ||
    //     msg.result?.includes(keyword) ||
    //     msg.error?.includes(keyword)
    //   ) {
    //     didMatchDevtools = true;
    //     break;
    //   }
    // }
    const logErrors: string[] = sessionDb.sessionLogs.allErrors().map(x => {
      const error = TypeSerializer.parse(x.data);
      return (error.clientError ?? error.error ?? error).message;
    });
    this.searchIndex.remove(x => x.id === id);
    this.searchIndex.add({
      id,
      commands: commandLabels,
      logs: logErrors,
    });
    return {
      heroSessionId: id,
      scriptEntrypoint: this.processEntrypoint(scriptEntrypoint),
      dbPath: sessionDb.path,
      startTime: new Date(startDate),
      state,
      error: errorOnLastCommand
        ? `${errorOnLastCommand.label}: ${errorOnLastCommand.error?.message ?? 'Error'}`
        : null,
      endTime: new Date(closeDate),
      // TODO: store input and output and return
      input: createSessionOptions.input,
      outputs: outputRebuilder.getLatestSnapshot()?.output,
    };
  }

  private processEntrypoint(scriptEntrypoint: string): string {
    const divider = scriptEntrypoint.includes('/') ? '/' : '\\';
    return scriptEntrypoint.split(divider).slice(-2).join(divider);
  }

  private onHeroSessionResumed(entry: IHeroSessionsListResult): void {
    entry.state = 'running';
    this.emit('update', [entry]);
  }

  private onHeroSessionClosed(entry: IHeroSessionsListResult): void {
    const update = this.processSession(entry.heroSessionId);
    Object.assign(entry, update);
    this.emit('update', [entry]);
    this.events.endGroup(entry.heroSessionId);
  }

  private onHeroSessionKeptAlive(entry: IHeroSessionsListResult): void {
    const update = this.processSession(entry.heroSessionId);
    Object.assign(entry, update);
    this.emit('update', [entry]);
  }
}

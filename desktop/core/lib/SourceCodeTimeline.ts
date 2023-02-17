import { Session } from '@ulixee/hero-core';
import { bindFunctions } from '@ulixee/commons/lib/utils';
import SourceLoader from '@ulixee/commons/lib/SourceLoader';
import ICommandMeta from '@ulixee/hero-interfaces/ICommandMeta';
import { SourceMapSupport } from '@ulixee/commons/lib/SourceMapSupport';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import ISourceCodeLocation from '@ulixee/commons/interfaces/ISourceCodeLocation';
import EventSubscriber from '@ulixee/commons/lib/EventSubscriber';
import ICommandUpdatedEvent from '@ulixee/desktop-interfaces/events/ICommandUpdatedEvent';
import ISourceCodeUpdatedEvent from '@ulixee/desktop-interfaces/events/ISourceCodeUpdatedEvent';
import CommandFormatter from '@ulixee/hero-core/lib/CommandFormatter';

export default class SourceCodeTimeline extends TypedEventEmitter<{
  source: ISourceCodeUpdatedEvent;
  command: ICommandUpdatedEvent;
}> {
  private sourceFileLines: { [path: string]: string[] } = {};
  private events = new EventSubscriber();
  private commandsById: { [id: number]: ICommandUpdatedEvent } = {};

  constructor(readonly entrypoint: string) {
    super();
    bindFunctions(this);

    this.entrypoint = SourceMapSupport.getSourceFile(this.entrypoint);
    this.sourceFileLines[this.entrypoint] =
      SourceLoader.getFileContents(this.entrypoint, false)?.split(/\r?\n/) ?? [];
  }

  public listen(heroSession: Session): void {
    this.events.on(heroSession.commands, 'start', this.onCommandStart);
    this.events.on(heroSession.commands, 'finish', this.onCommandFinished);
  }

  public loadCommands(commands: ICommandMeta[]): void {
    for (const command of commands) {
      this.onCommandFinished(command, true);
    }
  }

  public getCurrentState(): {
    commandsById: Record<number, ICommandUpdatedEvent>;
    sourceFileLines: Record<string, string[]>;
  } {
    return {
      commandsById: this.commandsById,
      sourceFileLines: this.sourceFileLines,
    };
  }

  public close(): void {
    this.events.close();
    this.commandsById = {};
  }

  public clearCache(): void {
    for (const filename of Object.keys(this.sourceFileLines)) {
      this.sourceFileLines[filename] = undefined;
      SourceMapSupport.clearCache(filename);
    }
    this.commandsById = {};
  }

  private onCommandStart(command: ICommandMeta): void {
    if (!command.callsite) return;
    const originalSourcePosition = command.callsite.map(x =>
      SourceMapSupport.getOriginalSourcePosition(x),
    );
    this.checkForSourceUpdates(originalSourcePosition);
    this.commandsById[command.id] = {
      command: CommandFormatter.parseResult(command),
      isComplete: false,
      originalSourcePosition,
    };
    this.emit('command', this.commandsById[command.id]);
  }

  private onCommandFinished(command: ICommandMeta, skipEmit = false): void {
    if (!command.callsite) return;
    const originalSourcePosition = command.callsite.map(x =>
      SourceMapSupport.getOriginalSourcePosition(x),
    );
    this.checkForSourceUpdates(originalSourcePosition);
    this.commandsById[command.id] = {
      command: CommandFormatter.parseResult(command),
      isComplete: true,
      originalSourcePosition,
    };
    if (!skipEmit) this.emit('command', this.commandsById[command.id]);
  }

  private checkForSourceUpdates(sourceLocations: ISourceCodeLocation[]): void {
    for (const sourcePosition of sourceLocations) {
      const { filename } = sourcePosition;
      if (!this.sourceFileLines[filename]) {
        this.sourceFileLines[filename] =
          SourceLoader.getFileContents(filename, false)?.split(/\r?\n/) ?? [];
        this.emit('source', {
          filename,
          lines: this.sourceFileLines[filename],
        });
      }
    }
  }
}

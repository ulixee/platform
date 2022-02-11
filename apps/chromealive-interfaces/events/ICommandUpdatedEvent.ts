import ICommandMeta from '@ulixee/hero-interfaces/ICommandMeta';
import type ISourceCodeLocation from '@ulixee/commons/interfaces/ISourceCodeLocation';

export default interface ICommandUpdatedEvent {
  command: ICommandMeta;
  isComplete: boolean;
  originalSourcePosition: ISourceCodeLocation[];
}

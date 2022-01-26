import IDataboxMeta from './IDataboxMeta';

export default interface ICoreSession {
  lastExternalId: number;
  lastCommandId: number;
  nextCommandId: number;
  getDataboxMeta(): Promise<IDataboxMeta>;
  recordOutput(
    changes: { type: string; value: any; path: string; timestamp: Date }[],
  ): void;
  close(): Promise<void>;
}

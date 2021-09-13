export interface IDataboxUpdatedEvent {
  input: any;
  output: any;
  bytes: number;
  changes: { path: string; type: string }[];
}

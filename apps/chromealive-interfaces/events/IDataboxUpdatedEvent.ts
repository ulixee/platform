export default interface IDataboxUpdatedEvent {
  output: any;
  bytes: number;
  changes: { path: string; type: string }[];
}

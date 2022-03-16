export default interface IDataboxOutputEvent {
  output: any;
  bytes: number;
  changes: { path: string; type: string }[];
}

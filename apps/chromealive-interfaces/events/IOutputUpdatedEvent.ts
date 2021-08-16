export default interface IOutputUpdatedEvent {
  output: any;
  bytes: number;
  changes: { path: string; type: string }[];
}

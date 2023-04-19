export default interface IQueryLogEntry {
  id: string;
  versionHash: string;
  date: Date;
  query: string;
  input: any;
  affiliateId: string;
  outputs: any[];
  error?: Error;
  milliseconds: number;
  bytes: number;
  microgons: number;
  creditId?: string;
  micronoteId?: string;
}

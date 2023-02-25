export default interface IHeroSessionsApi {
  list(withError?: boolean): IHeroSessionsListResult[];
  search(keyword: string): IHeroSessionsSearchResult[];
}

export interface IHeroSessionsListResult {
  heroSessionId: string;
  scriptEntrypoint: string;
  dbPath?: string;
  state: 'running' | 'kept-alive' | 'error' | 'complete';
  datastore?: { id: string; scriptEntrypoint: string; name: string };
  startTime: Date;
  endTime?: Date;
  input?: Record<string, any>;
  outputs?: Record<string, any>[];
  error?: string;
}

export interface IHeroSessionsSearchResult {
  heroSessionId: string;
  matches?: { type: 'command' | 'devtools' | 'logs'; preview: string; id?: number }[];
}

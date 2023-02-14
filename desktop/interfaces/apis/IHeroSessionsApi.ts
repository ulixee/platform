export default interface IHeroSessionsApi {
  list(withError?: boolean): Promise<ISessionsSearchResult[]>;
  search(keyword: string): Promise<ISessionsSearchResult[]>;
}

export interface ISessionsSearchResult {
  heroSessionId: string;
  dbPath: string;
  hasError: boolean;
}

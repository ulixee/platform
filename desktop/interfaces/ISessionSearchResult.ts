import IResourceSearchResult from './IResourceSearchResult';
import IElementSummary from './IElementSummary';

export default interface ISessionSearchResult {
  searchingContext: ISearchContext;
  elements: IElementSummary[];
  resources: IResourceSearchResult[];
}

export interface ISearchContext {
  tabId: number;
  baseTime: number;
  startTime: number;
  endTime: number;
  documentUrl: string;
}

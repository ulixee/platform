import { IChromeAliveEvents } from './index';

export interface IChromeAliveEvent<T extends keyof IChromeAliveEvents> {
  eventType: T;
  data: IChromeAliveEvents[T];
}

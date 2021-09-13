import IChromeAliveEvents from './index';

export default interface IChromeAliveEvent<T extends keyof IChromeAliveEvents> {
  eventType: T;
  data: IChromeAliveEvents[T];
}

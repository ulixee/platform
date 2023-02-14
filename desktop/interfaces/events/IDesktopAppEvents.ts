import ISessionCreateOptions from '@ulixee/hero-interfaces/ISessionCreateOptions';

export default interface IDesktopAppEvents {
  'App.quit': null;
  'Session.opened': {
    heroSessionId: string;
    options: ISessionCreateOptions;
    dbPath: string;
    startDate: Date;
  };
}

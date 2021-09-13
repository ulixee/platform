import Server from '../index';

export abstract class BaseCoreConnector {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected constructor(server: Server) {
    // whatever
  }

  public start(): Promise<void> {
    return Promise.resolve();
  }

  public abstract close(): Promise<any> | void;
}

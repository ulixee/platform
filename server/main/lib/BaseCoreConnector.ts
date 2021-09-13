import Server from '../index';

export default abstract class BaseCoreConnector {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected constructor(server: Server) {
    // whatever
  }

  public abstract close();
}

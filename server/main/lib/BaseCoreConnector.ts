import Server from '../index';

export default abstract class BaseCoreConnector {
  protected constructor(server: Server) {
    // whatever
  }

  public abstract close();
}

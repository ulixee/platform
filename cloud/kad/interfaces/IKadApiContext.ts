import { IBoundLog } from '@ulixee/commons/interfaces/ILog';
import Kad from '../index';
import ConnectionToKadClient from '../lib/ConnectionToKadClient';

export default interface IKadApiContext {
  kad: Kad;
  connection: ConnectionToKadClient;
  logger: IBoundLog;
}

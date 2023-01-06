import ConnectionToClient from '@ulixee/net/lib/ConnectionToClient';
import { IDataboxApis } from '@ulixee/specification/databox';
import IDataboxEvents from '@ulixee/databox/interfaces/IDataboxEvents';
import IDataboxApiContext from './IDataboxApiContext';
import DataboxStorage from '../lib/DataboxStorage';

export default interface IDataboxConnectionToClient
  extends ConnectionToClient<IDataboxApis, IDataboxEvents, IDataboxApiContext> {
  isInternal?: boolean;
  databoxStorage?: DataboxStorage;
}

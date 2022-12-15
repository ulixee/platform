import ConnectionToClient from '@ulixee/net/lib/ConnectionToClient';
import { IDataboxApis } from '@ulixee/specification/databox';
import IDataboxApiContext from './IDataboxApiContext';
import DataboxStorage from '../lib/DataboxStorage';

export default interface IDataboxConnectionToClient extends ConnectionToClient<IDataboxApis, never, IDataboxApiContext> {
  isInternal?: boolean;
  databoxStorage?: DataboxStorage;
}
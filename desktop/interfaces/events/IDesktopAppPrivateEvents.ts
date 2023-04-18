import IArgonFile from '@ulixee/platform-specification/types/IArgonFile';
import type IQueryLogEntry from '@ulixee/datastore/interfaces/IQueryLogEntry';
import type IDatastoreDeployLogEntry from '@ulixee/datastore-core/interfaces/IDatastoreDeployLogEntry';
import { ICloudConnected } from '../apis/IDesktopApis';

export default interface IDesktopAppPrivateEvents {
  'Datastore.onDeployed': IDatastoreDeployLogEntry;
  'User.onQuery': IQueryLogEntry;
  'Cloud.onConnected': ICloudConnected;
  'Argon.opened': IArgonFile;
}

import Datastore from '@ulixee/datastore';
import IDatastoreMetadata from '@ulixee/datastore/interfaces/IDatastoreMetadata';

class TestDatastore extends Datastore {
  override get metadata(): IDatastoreMetadata {
    const meta = super.metadata;
    meta.coreVersion = '1.0.0';
    return meta;
  }
}

export default new TestDatastore({});

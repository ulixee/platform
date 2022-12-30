import Databox from '@ulixee/databox';
import IDataboxMetadata from '@ulixee/databox/interfaces/IDataboxMetadata';

class TestDatabox extends Databox {
  override get metadata(): IDataboxMetadata {
    const meta = super.metadata;
    meta.coreVersion = '1.0.0';
    return meta;
  }
}

export default new TestDatabox({});

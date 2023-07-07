import Datastore from '@ulixee/datastore';
import errorStack from './errorStack';

export default new Datastore({
  id: 'error-stack',
  version: '0.0.1',
  extractors: {
    errorStack,
  },
});

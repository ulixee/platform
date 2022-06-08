import * as Path from 'path';
import { getCacheDirectory } from '@ulixee/commons/lib/dirUtils';

export default {
  databoxStorage: process.env.ULX_DATABOX_DIR ?? Path.join(getCacheDirectory(), 'ulixee'),
};

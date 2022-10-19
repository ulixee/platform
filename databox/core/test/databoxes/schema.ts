import Databox from '@ulixee/databox';
import { boolean, string } from '@ulixee/schema';

export default new Databox({
  run(databox) {
    databox.output = { success: true };
  },
  schema: {
    input: {
      field: string({ minLength: 1, description: 'a field you should use' }),
    },
    output: {
      success: boolean(),
    },
  },
});

import Datastore, { Runner } from '@ulixee/datastore';
import * as moment from 'moment';
import { date, string } from '@ulixee/schema';

export default new Datastore({
  runners: {
    moment: new Runner({
      run(ctx) {
        ctx.Output.emit({ date: moment(ctx.input.date).toDate() });
      },
      schema: {
        input: {
          date: string({ format: 'date' }),
        },
        output: {
          date: date(),
        },
      },
    }),
  },
});

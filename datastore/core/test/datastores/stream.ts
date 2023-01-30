import Datastore, { Runner } from '@ulixee/datastore';

export default new Datastore({
  runners: {
    streamer: new Runner(async ctx => {
      for (let i=0;i<3;i+=1) {
        await new Promise(resolve => setTimeout(resolve, 100));
        ctx.Output.emit({ record: i });
      }
    }),
  },
});

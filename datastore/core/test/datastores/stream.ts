import Datastore, { Function } from '@ulixee/datastore';

export default new Datastore({
  functions: {
    streamer: new Function(async ctx => {
      for (let i=0;i<3;i+=1) {
        await new Promise(resolve => setTimeout(resolve, 100));
        ctx.Output.emit({ record: i });
      }
    }),
  },
});

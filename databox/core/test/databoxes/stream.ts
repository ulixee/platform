import Databox, { Function } from '@ulixee/databox';

export default new Databox({
  functions: {
    streamer: new Function(async ctx => {
      for (let i=0;i<3;i+=1) {
        await new Promise(resolve => setTimeout(resolve, 100));
        ctx.Output.emit({ record: i });
      }
    }),
  },
});

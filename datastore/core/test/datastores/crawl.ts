import Datastore, { Crawler, Extractor } from '@ulixee/datastore';
import { boolean, date, number, string } from '@ulixee/schema';

let runCrawlerTime: Date;
const datastore = new Datastore({
  crawlers: {
    crawl: new Crawler({
      async run(ctx) {
        runCrawlerTime = new Date();
        return {
          toCrawlerOutput() {
            return Promise.resolve({
              sessionId: ctx.input.sessionId,
              crawler: 'none',
              version: '1',
            });
          },
        };
      },
    }),
    crawlWithSchema: new Crawler({
      async run(ctx) {
        runCrawlerTime = new Date();
        return {
          toCrawlerOutput() {
            return Promise.resolve({
              sessionId: ctx.input.sessionId,
              crawler: 'none',
              version: '1',
            });
          },
        };
      },
      schema: {
        input: {
          sessionId: string(),
          colBool: boolean(),
          colNum: number(),
        },
      },
    }),
  },
  extractors: {
    crawlCall: new Extractor(async ctx => {
      const crawl = await ctx.crawl(datastore.crawlers.crawl, ctx.input);
      ctx.Output.emit({ ...crawl, runCrawlerTime });
    }),
    crawlWithSchemaCall: new Extractor({
      async run(ctx) {
        const crawl = await ctx.crawl(datastore.crawlers.crawlWithSchema, ctx.input);
        ctx.Output.emit({ ...crawl, runCrawlerTime });
      },
      schema: {
        input: {
          sessionId: string(),
          colBool: boolean(),
          colNum: number(),
        },
        output: {
          sessionId: string(),
          runCrawlerTime: date({ optional: true }),
        },
      },
    }),
  },
});

export default datastore;

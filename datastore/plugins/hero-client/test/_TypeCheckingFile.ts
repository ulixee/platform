import Datastore, { Crawler, Extractor } from '@ulixee/datastore';
import assert = require('assert');
import { boolean, number, string } from '@ulixee/schema';
import { HeroExtractorPlugin } from '../index';

export function typeChecking(): void {
  const extractor = new Extractor(
    {
      async run(context) {
        const { Hero, input } = context;
        const hero = new Hero();
        await hero.goto('t');
        // @ts-expect-error - make sure hero is type checked (not any)
        await hero.unsupportedMethod();
        // @ts-expect-error
        const s: number = input.text;

        const heroReplay = new context.HeroReplay({ replaySessionId: '1' });
        const detached = heroReplay.detachedElements.getAll('test');
        assert(detached, 'should exist');
        // @ts-expect-error - make sure heroReplay is type checked (not any)
        await heroReplay.goto();
        // @ts-expect-error
        input.text = 1;
      },
      schema: {
        input: {
          text: string(),
          field2: boolean({ optional: true }),
        },
      },
    },
    HeroExtractorPlugin,
  );
  void extractor.runInternal({ showChrome: true, input: { text: '123' } });

  const crawler = new Crawler(
    {
      async run(ctx) {
        // @ts-expect-error
        const num: number = ctx.input.colBool;

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
          colBool: boolean({ optional: true }),
          colNum: number(),
        },
      },
    },
    HeroExtractorPlugin,
  );
  // @ts-expect-error
  void crawler.runInternal({ showChrome: true, input: { text: '123' } });
  void crawler.runInternal({ showChrome: true, input: { colNum: 1, sessionId: '123' } });
  const crawlerWithoutSchema = new Crawler({
    async run(ctx) {
      // Can't get typescript to check this field when no schema  // @ts-expect-error
      const num: boolean = ctx.input.maxTimeInCache;

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
  });
  // Can't get typescript to check this field when no schema  // @ts-expect-error
  void crawlerWithoutSchema.runInternal({ input: { maxTimeInCache: new Date() } });

  const datastore = new Datastore({
    crawlers: {
      plain: new Crawler(async ({ Hero }) => {
        return new Hero();
      }, HeroExtractorPlugin),
      crawlerSchema: new Crawler(
        {
          async run({ Hero, input }) {
            const hero = new Hero();
            await hero.goto(input.url);

            // @ts-expect-error: value isn't on input
            const x = input.value;
            return hero;
          },
          schema: {
            input: {
              url: string({ format: 'url' }),
            },
          },
        },
        HeroExtractorPlugin,
      ),
    },

    extractors: {
      hero: new Extractor(async ({ Hero }) => {
        const hero = new Hero();
        await hero.goto('place');
        // @ts-expect-error - make sure hero is type checked (not any)
        await hero.unsupportedMethod();
      }, HeroExtractorPlugin),

      heroSchema: new Extractor(
        {
          schema: {
            input: {
              url: string({ format: 'url' }),
            },
            output: {
              html: string(),
              title: boolean({ optional: true }),
            },
          },
          async run({ Hero, input, Output, crawl }) {
            const { plain, crawlerSchema } = datastore.crawlers;
            await crawl(plain, {
              input: { maxTimeInCache: 500, anyTest: 1 },
            });
            await crawl(crawlerSchema, {
              input: { maxTimeInCache: 500, url: '1' },
            });
            // @ts-expect-error
            await crawl(crawlerSchema, { input: { url: 1 } });

            const hero = new Hero();
            await hero.goto(input.url);
            const output = new Output();
            output.html = await hero.document.body.outerHTML;
            // @ts-expect-error: value isn't on input
            const x = input.value;
          },
        },
        HeroExtractorPlugin,
      ),
    },
  });

  void (async () => {
    await datastore.extractors.hero.runInternal({ replaySessionId: '1' });
    // @ts-expect-error
    await datastore.extractors.hero.runInternal({ showChrome: '1,', replaySessionId: '1' });

    await datastore.crawlers.plain
      // Can't get typescript to check this field when no schema // @ts-expect-error
      .runInternal({ input: { maxTimeInCache: new Date(), anyTest: 1 } });

    await datastore.crawlers.crawlerSchema
      // @ts-expect-error
      .runInternal({ input: { urls: '1', maxTimeInCache: 100 } });

    // @ts-expect-error
    await datastore.crawl('crawlerSchema', { urls: '1', maxTimeInCache: 100 });
  })();
}

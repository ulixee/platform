import Datastore, { Crawler, Function } from '@ulixee/datastore/index';
import * as assert from 'assert';
import { boolean, number, string } from '@ulixee/schema';
import { HeroFunctionPlugin } from '../index';

export function typeChecking(): void {
  const func = new Function(
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
    HeroFunctionPlugin,
  );
  void func.stream({ showChrome: true, input: { text: '123' } });

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
    HeroFunctionPlugin,
  );
  // @ts-expect-error
  void crawler.stream({ showChrome: true, input: { text: '123' } });
  void crawler.stream({ showChrome: true, input: { colNum: 1, sessionId: '123' } });
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
  void crawlerWithoutSchema.stream({ input: { maxTimeInCache: new Date() } });

  const datastore = new Datastore({
    crawlers: {
      plain: new Crawler(async ({ Hero }) => {
        return new Hero();
      }, HeroFunctionPlugin),
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
        HeroFunctionPlugin,
      ),
    },

    functions: {
      hero: new Function(async ({ Hero }) => {
        const hero = new Hero();
        await hero.goto('place');
        // @ts-expect-error - make sure hero is type checked (not any)
        await hero.unsupportedMethod();
      }, HeroFunctionPlugin),

      heroSchema: new Function(
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
          async run({ Hero, input, Output }) {
            const hero = new Hero();
            await hero.goto(input.url);
            const output = new Output();
            output.html = await hero.document.body.outerHTML;
            // @ts-expect-error: value isn't on input
            const x = input.value;
          },
        },
        HeroFunctionPlugin,
      ),
    },
  });

  void (async () => {
    await datastore.functions.hero.stream({ replaySessionId: '1' }).catch();
    // @ts-expect-error
    await datastore.functions.hero.stream({ showChrome: '1,', replaySessionId: '1' }).catch();

    await datastore.crawl('plain', { maxTimeInCache: 500, anyTest: 1 }).catch();
    await datastore.crawlers.plain
      // Can't get typescript to check this field when no schema // @ts-expect-error
      .stream({ input: { maxTimeInCache: new Date(), anyTest: 1 } })
      .catch();

    await datastore.crawl('crawlerSchema', { url: '1', maxTimeInCache: 100 }).catch();
    await datastore.crawlers.crawlerSchema
      // @ts-expect-error
      .stream({ input: { urls: '1', maxTimeInCache: 100 } })
      .catch();

    // @ts-expect-error
    await datastore.crawl('crawlerSchema', { urls: '1', maxTimeInCache: 100 }).catch();
  })();
}

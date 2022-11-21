import Databox, { Function } from '@ulixee/databox/index';
import * as assert from 'assert';
import { string } from '@ulixee/schema';
import { HeroFunctionPlugin, IHeroReplayFunctionContext } from '../index';

export function typeChecking(): void {
  const func = new Function(
    {
      async run(context) {
        const { hero, input } = context;
        await hero.goto('t');
        // @ts-expect-error - make sure hero is type checked (not any)
        await hero.unsupportedMethod();
        // @ts-expect-error
        const s: number = input.text;
      },
      afterHeroCompletes(ctx) {
        const detached = ctx.heroReplay.detachedElements.getAll('test');
        assert(detached, 'should exist');
        // @ts-expect-error - make sure heroReplay is type checked (not any)
        await ctx.heroReplay.goto();
        // // @ts-expect-error
        ctx.input.text = 1;
      },
      schema: {
        input: {
          text: string(),
        },
      },
    },
    HeroFunctionPlugin,
  );
  void func.exec({ showChrome: true });

  const databox = new Databox({
    functions: {
      hero: new Function(async ({ hero }) => {
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
            },
          },
          async run({ hero, input, output }) {
            await hero.goto(input.url);
            output.html = await hero.document.body.outerHTML;
            // @ts-expect-error: value isn't on input
            const x = input.value;
          },
        },
        HeroFunctionPlugin,
      ),

      generic: ({ output }) => {
        output.test = '1';
      },

      struct: {
        schema: {
          output: {
            url: string({ format: 'url' }),
          },
        },
        run({ output }) {
          output.url = 'test';
          // // @ts-expect-error
          // output.url = 1;
        },
      },
    },
  });

  void (async () => {
    await databox.functions.hero.exec({ replaySessionId: '1' }).catch();
    // @ts-expect-error
    await databox.functions.hero.exec({ showChrome: '1,', replaySessionId: '1' }).catch();

    await databox.functions.generic.exec({});

    const result = await databox.functions.struct.exec({});
    const s: string = result.url;
    // @ts-expect-error
    const n: number = result.url;
  })();
}

'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const databox = require('@ulixee/databox');
const databox_for_hero_1 = require('@ulixee/databox-plugins-hero');
const helper_1 = require('./helper');
exports.default = new databox.default({
  functions: {
    default: new databox_for_hero_1.Function(
      {
        defaults: {
          input: {
            url: 'https://example.org',
          },
        },
        async run(ctx) {
          const text = (0, helper_1.testFunction)();
          const { input, output, Hero } = ctx;
          const hero = new Hero();
          await hero.goto(input.url);
          const title = await hero.document.title;
          output.text = text;
          output.title = title;
          output.body = await hero.document.body.textContent;
          console.log(`LOADED ${input.url}: ${title}`);
          await hero.close();
        },
      },
      databox_for_hero_1.HeroFunctionPlugin,
    ),
  },
});
//# sourceMappingURL=index.js.map

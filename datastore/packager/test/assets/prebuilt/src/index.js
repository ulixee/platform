'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const datastore = require('@ulixee/datastore');
const datastore_for_hero_1 = require('@ulixee/datastore-plugins-hero');
const helper_1 = require('./helper');
exports.default = new datastore.default({
  functions: {
    default: new datastore_for_hero_1.Function(
      {
        defaults: {
          input: {
            url: 'https://example.org',
          },
        },
        async run(ctx) {
          const text = (0, helper_1.testFunction)();
          const { input, Output, Hero } = ctx;
          const hero = new Hero();
          await hero.goto(input.url);
          const title = await hero.document.title;
          const output = new Output();
          output.text = text;
          output.title = title;
          output.body = await hero.document.body.textContent;
          console.log(`LOADED ${input.url}: ${title}`);
          await hero.close();
        },
      },
      datastore_for_hero_1.HeroFunctionPlugin,
    ),
  },
});
//# sourceMappingURL=index.js.map

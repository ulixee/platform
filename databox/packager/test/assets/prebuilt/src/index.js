"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const databox_for_hero_1 = require("@ulixee/databox-for-hero");
const helper_1 = require("./helper");
exports.default = new databox_for_hero_1.default({
    defaults: {
        input: {
            url: 'https://example.org',
        },
    },
    async run(databox) {
        const text = (0, helper_1.testFunction)();
        const { input, output, hero } = databox;
        await hero.goto(input.url);
        const title = await hero.document.title;
        output.text = text;
        output.title = title;
        output.body = await hero.document.body.textContent;
        console.log(`LOADED ${input.url}: ${title}`);
        await hero.close();
    },
});
//# sourceMappingURL=index.js.map
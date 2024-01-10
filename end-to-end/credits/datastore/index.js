"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const datastore_1 = require("@ulixee/datastore");
exports.default = new datastore_1.default({
    id: 'end-to-end',
    version: '0.0.1',
    extractors: {
        default: new datastore_1.Extractor({
            pricePerQuery: 50e4,
            run(ctx) {
                ctx.Output.emit({ success: true, input: ctx.input });
            },
        }),
    },
});
//# sourceMappingURL=index.js.map
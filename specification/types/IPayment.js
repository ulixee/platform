"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentSchema = void 0;
const specification_1 = require("@ulixee/specification");
const IMicronote_1 = require("@ulixee/specification/types/IMicronote");
exports.PaymentSchema = specification_1.z.object({
    micronote: IMicronote_1.MicronoteSchema.extend({
        holdAuthorizationCode: specification_1.z
            .string()
            .length(16)
            .optional()
            .describe('A hold authorization code granting sub-holds on a micronote.'),
    }).optional(),
    credits: specification_1.z
        .object({
        id: specification_1.z
            .string()
            .length(11)
            .regex(/^crd[A-Za-z0-9_]{8}$/, 'This is not a Datastore credits id (starting with "cred", following by 8 alphanumeric characters).'),
        secret: specification_1.z.string().length(12),
    })
        .optional(),
});
//# sourceMappingURL=IPayment.js.map
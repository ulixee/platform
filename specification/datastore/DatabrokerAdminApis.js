"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabrokerAdminApisSchema = void 0;
const zod_1 = require("zod");
const types_1 = require("../types");
const OkSchema = zod_1.z.object({ success: zod_1.z.boolean() });
const organizationIdValidation = zod_1.z
    .string()
    .length(21)
    .regex(/[A-Za-z0-9_-]{21}/)
    .describe('The organization id');
const nameValidation = zod_1.z.string().min(1).max(255).optional();
exports.DatabrokerAdminApisSchema = {
    'System.overview': {
        args: zod_1.z.object({}),
        result: zod_1.z.object({
            localchainBalance: types_1.milligonsValidation.describe('The balance in milligons'),
            localchainAddress: types_1.addressValidation.describe('The localchain address'),
            totalOrganizationBalance: types_1.milligonsValidation.describe('The active balance at organizations in milligons'),
            grantedBalance: types_1.milligonsValidation.describe('The overall amount granted to organizations historically in milligons'),
            organizations: zod_1.z.number().int().nonnegative().describe('The number of organizations'),
            users: zod_1.z.number().int().nonnegative().describe('The number of users'),
            escrows: zod_1.z.number().int().nonnegative().describe('The number of escrows created'),
            openEscrows: zod_1.z.number().int().nonnegative().describe('The number of open escrows'),
            balancePendingEscrowSettlement: types_1.milligonsValidation.describe('The balance in milligons of all escrows pending settlement'),
        }),
    },
    'Organization.create': {
        args: zod_1.z.object({
            name: nameValidation,
            balance: types_1.milligonsValidation.describe('The initial balance to allocate to this organization'),
        }),
        result: zod_1.z.object({
            id: organizationIdValidation,
        }),
    },
    'Organization.editName': {
        args: zod_1.z.object({
            organizationId: organizationIdValidation,
            name: nameValidation,
        }),
        result: OkSchema,
    },
    'Organization.grant': {
        args: zod_1.z.object({
            organizationId: organizationIdValidation,
            amount: types_1.milligonsValidation.describe('The amount to grant to the organization in milligons'),
        }),
        result: OkSchema,
    },
    'Organization.delete': {
        args: zod_1.z.object({
            organizationId: organizationIdValidation,
        }),
        result: OkSchema,
    },
    'Organization.get': {
        args: zod_1.z.object({
            organizationId: organizationIdValidation,
        }),
        result: zod_1.z.object({
            id: organizationIdValidation,
            name: nameValidation,
            balance: types_1.milligonsValidation.describe('The balance allocated to the organization in milligons'),
            balanceInEscrows: types_1.milligonsValidation.describe('The balance currently in active escrows'),
        }),
    },
    'Organization.list': {
        args: zod_1.z.object({}),
        result: zod_1.z
            .object({
            id: organizationIdValidation,
            name: nameValidation,
            balance: types_1.milligonsValidation.describe('The balance allocated to the organization in milligons'),
            balanceInEscrows: types_1.milligonsValidation.describe('The balance currently in active escrows'),
        })
            .array(),
    },
    'Organization.users': {
        args: zod_1.z.object({
            organizationId: organizationIdValidation,
        }),
        result: zod_1.z
            .object({
            identity: types_1.identityValidation.describe('The user identity'),
            name: nameValidation,
        })
            .array(),
    },
    'User.create': {
        args: zod_1.z.object({
            organizationId: organizationIdValidation,
            identity: types_1.identityValidation.describe('The user identity'),
            name: nameValidation,
        }),
        result: OkSchema,
    },
    'User.editName': {
        args: zod_1.z.object({
            identity: types_1.identityValidation.describe('The user identity'),
            name: nameValidation,
        }),
        result: OkSchema,
    },
    'User.delete': {
        args: zod_1.z.object({
            identity: types_1.identityValidation.describe('The user identity'),
        }),
        result: OkSchema,
    },
    'WhitelistedDomains.list': {
        args: zod_1.z.object({}),
        result: zod_1.z.string().array(),
    },
    'WhitelistedDomains.add': {
        args: zod_1.z.object({
            domain: zod_1.z.string().max(255),
        }),
        result: OkSchema,
    },
    'WhitelistedDomains.delete': {
        args: zod_1.z.object({
            domain: zod_1.z.string().max(255),
        }),
        result: OkSchema,
    },
};
//# sourceMappingURL=DatabrokerAdminApis.js.map
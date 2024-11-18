import { z } from 'zod';
import { addressValidation, identityValidation, microgonsValidation } from '../types';
import { IZodSchemaToApiTypes } from '../utils/IZodApi';

const OkSchema = z.object({ success: z.boolean() });

const organizationIdValidation = z
  .string()
  .length(21)
  .regex(/^[A-Za-z0-9_-]{21}$/)
  .describe('The organization id');

const nameValidation = z.string().min(1).max(255).optional();

export const DatabrokerAdminApisSchema = {
  'System.overview': {
    args: z.object({}),
    result: z.object({
      localchainBalance: microgonsValidation.describe('The balance in microgons'),
      localchainAddress: addressValidation.describe('The localchain address'),
      totalOrganizationBalance: microgonsValidation.describe(
        'The active balance at organizations in microgons',
      ),
      grantedBalance: microgonsValidation.describe(
        'The overall amount granted to organizations historically in microgons',
      ),
      organizations: z.number().int().nonnegative().describe('The number of organizations'),
      users: z.number().int().nonnegative().describe('The number of users'),
      channelHolds: z.number().int().nonnegative().describe('The number of channelHolds created'),
      openChannelHolds: z.number().int().nonnegative().describe('The number of open channelHolds'),
      balancePendingChannelHoldSettlement: microgonsValidation.describe(
        'The balance in microgons of all channelHolds pending settlement',
      ),
    }),
  },
  'Organization.create': {
    args: z.object({
      name: nameValidation,
      balance: microgonsValidation.describe('The initial balance to allocate to this organization'),
    }),
    result: z.object({
      id: organizationIdValidation,
    }),
  },
  'Organization.editName': {
    args: z.object({
      organizationId: organizationIdValidation,
      name: nameValidation,
    }),
    result: OkSchema,
  },
  'Organization.grant': {
    args: z.object({
      organizationId: organizationIdValidation,
      amount: microgonsValidation.describe('The amount to grant to the organization in microgons'),
    }),
    result: OkSchema,
  },
  'Organization.delete': {
    args: z.object({
      organizationId: organizationIdValidation,
    }),
    result: OkSchema,
  },
  'Organization.get': {
    args: z.object({
      organizationId: organizationIdValidation,
    }),
    result: z.object({
      id: organizationIdValidation,
      name: nameValidation,
      balance: microgonsValidation.describe(
        'The balance allocated to the organization in microgons',
      ),
      balanceInChannelHolds: microgonsValidation.describe(
        'The balance currently in active channelHolds',
      ),
    }),
  },
  'Organization.list': {
    args: z.object({}),
    result: z
      .object({
        id: organizationIdValidation,
        name: nameValidation,
        balance: microgonsValidation.describe(
          'The balance allocated to the organization in microgons',
        ),
        balanceInChannelHolds: microgonsValidation.describe(
          'The balance currently in active channelHolds',
        ),
      })
      .array(),
  },
  'Organization.users': {
    args: z.object({
      organizationId: organizationIdValidation,
    }),
    result: z
      .object({
        identity: identityValidation.describe('The user identity'),
        name: nameValidation,
      })
      .array(),
  },
  'User.create': {
    args: z.object({
      organizationId: organizationIdValidation,
      identity: identityValidation.describe('The user identity'),
      name: nameValidation,
    }),
    result: OkSchema,
  },
  'User.editName': {
    args: z.object({
      identity: identityValidation.describe('The user identity'),
      name: nameValidation,
    }),
    result: OkSchema,
  },
  'User.delete': {
    args: z.object({
      identity: identityValidation.describe('The user identity'),
    }),
    result: OkSchema,
  },
  'WhitelistedDomains.list': {
    args: z.object({}),
    result: z.string().array(),
  },
  'WhitelistedDomains.add': {
    args: z.object({
      domain: z.string().max(255),
    }),
    result: OkSchema,
  },
  'WhitelistedDomains.delete': {
    args: z.object({
      domain: z.string().max(255),
    }),
    result: OkSchema,
  },
};

type IDatabrokerAdminApiTypes = IZodSchemaToApiTypes<typeof DatabrokerAdminApisSchema>;

export { IDatabrokerAdminApiTypes };

export default IDatabrokerAdminApiTypes;

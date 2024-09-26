import { z } from 'zod';

export const semverRegex = /(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)/;
export const semverValidation = z
  .string()
  .regex(new RegExp(`^${semverRegex.source}$`))
  .describe('A semver');

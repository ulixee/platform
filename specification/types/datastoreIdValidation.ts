import { z } from 'zod';

export const datastoreRegex = /[a-z0-9-]{2,50}/;

export const datastoreIdValidation = z
  .string()
  .min(2)
  .max(50)
  .regex(
    new RegExp(`^${datastoreRegex.source}`),
    'This is not a valid datastoreId (2-20 alphanumeric characters).',
  );

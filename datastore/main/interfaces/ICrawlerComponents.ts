import ICrawlerOutputSchema from './ICrawlerOutputSchema';

export default interface ICrawlerComponents<
  TSchema,
  TContext,
  TDisableCache extends boolean = false,
> {
  name?: string;
  description?: string;
  pricePerQuery?: number;
  addOnPricing?: {
    perKb?: never;
  };
  minimumPrice?: number;
  schema?: TSchema;
  disableCache?: TDisableCache;
  run(context: TContext): Promise<{ toCrawlerOutput(): Promise<ICrawlerOutputSchema> }>;
}

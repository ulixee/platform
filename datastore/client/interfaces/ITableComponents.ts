export default interface ITableComponents<TSchema, TSeedlings> {
  name?: string;
  description?: string;
  pricePerQuery?: number;
  schema: TSchema;
  seedlings?: TSeedlings[];
  isPublic?: boolean;
}

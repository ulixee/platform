export default interface ITableComponents<TSchema, TSeedlings> {
  name?: string;
  description?: string;
  schema: TSchema;
  seedlings?: TSeedlings[];
  isPublic?: boolean;
}

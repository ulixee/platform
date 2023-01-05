export default interface ITableComponents<TSchema> {
  name?: string;
  description?: string;
  schema: TSchema;
  seedlings?: any[];
  isPublic?: boolean;
}
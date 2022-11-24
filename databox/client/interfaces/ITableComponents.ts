export default interface ITableComponents<TSchema> {
  name?: string;
  schema: TSchema;
  seedlings?: any[];
  isPublic?: boolean;
}
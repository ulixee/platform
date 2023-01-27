import { Table } from '@ulixee/datastore';
import { boolean, string } from '@ulixee/schema';

export default new Table({
  schema: {
    firstName: string(),
    lastName: string(),
    isTester: boolean(),
  },
  seedlings: [
    { firstName: 'Caleb', lastName: 'Clark', isTester: true },
    { firstName: 'Blake', lastName: 'Byrnes' },
  ],
})
import { Table } from '@ulixee/datastore';
import { bigint, date, string } from '@ulixee/schema';

export default new Table({
  schema: {
    firstName: string(),
    lastName: string(),
    birthdate: date({ optional: true }),
    commits: bigint({ optional: true }),
  },
  async onCreated(): Promise<void> {
    await this.insertInternal(
      { firstName: 'Caleb', lastName: 'Clark', birthdate: new Date('1982/09/30') },
      { firstName: 'Blake', lastName: 'Byrnes', commits: 1n },
    );
  },
});

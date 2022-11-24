// import HeroPlugin from '@ulixee/databox-hero-plugin';
import { Table, Schema } from './index';

const table = new Table({
  // createSql,
  schema: {
    firstName: Schema.string(),
    lastName: Schema.string(),
  },
  seedlings: [
    { firstName: 'Caleb', lastName: 'Clark' },
    { firstName: 'Blake', lastName: 'Byrnes' },
  ],
  isPublic: true,
});

async function run(): Promise<void> {
  await table.query('INSERT INTO this (firstName, lastName) VALUES($1, $2)', ['Glen', 'DC']);
  const output1 = await table.query('SELECT firstName FROM this');
}

run()
.then(() => {
  console.log('DONE!');
  return;
})
.catch(error => console.log(error));

export default table;
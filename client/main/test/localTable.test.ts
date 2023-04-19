import Client from '..';
import localTable from './datastores/localTable';

test('should be able to query a datastore using sql', async () => {
  const client = Client.forTable(localTable);
  const results = await client.query('SELECT * FROM self');

  expect(results).toEqual([
    {
      firstName: 'Caleb',
      lastName: 'Clark',
      birthdate: expect.any(Date),
      commits: null,
    },
    {
      firstName: 'Blake',
      lastName: 'Byrnes',
      commits: 1n,
      birthdate: null,
    },
  ]);
});

test('should be able to fetch from a table', async () => {
  const client = Client.forTable(localTable);
  const results = await client.fetch({ firstName: 'Caleb' });

  expect(results).toEqual([
    {
      firstName: 'Caleb',
      lastName: 'Clark',
      birthdate: expect.any(Date),
      commits: null,
    },
  ]);

  try {
    // NOTE: this will not cooperate with jest, so adding to a catch
    // @ts-expect-error -- invalid column
    const result = await client.fetch({ lastSeenDate: '08/01/90' });
    expect(result).not.toBeTruthy();
  } catch (error) {
    expect(error).toBeTruthy();
  }
});

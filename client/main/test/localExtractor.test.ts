import Client from '..';
import localExtractor from './datastores/localExtractor';

test('should be able to query a datastore using sql', async () => {
  const client = Client.forExtractor(localExtractor);
  const results = await client.query('SELECT * FROM test(shouldTest => $1)', [true]);

  expect(results).toEqual([
    {
      testerEcho: true,
      lastName: 'Clark',
      greeting: 'Hello world',
    },
  ]);
});

test('should be able to run a datastore function', async () => {
  const client = Client.forExtractor(localExtractor);

  const testTypes = () => {
    // @ts-expect-error
    void client.run({ notValid: 1 });
  };

  const results = await client.run({ shouldTest: true });

  expect(results).toEqual([
    {
      testerEcho: true,
      lastName: 'Clark',
      greeting: 'Hello world',
    },
  ]);

  // @ts-expect-error - Test typing works
  const test: number = results[0].testerEcho;
  expect(test).not.toBe(expect.any(Number));

  // @ts-expect-error
  const first = results[0].firstName;
  expect(first).toBeUndefined();
});

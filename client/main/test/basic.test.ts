import Client from '../index';
import defaults from '../lib/defaults';

describe('basic Client tests', () => {
  it('automatically parses the connection string', async () => {
    const client = new Client('ulx://username:password@domain.com:1818/database');
    // @ts-ignore
    const { user, password, host, port, database } = client;
    expect(user).toBe('username');
    expect(password).toBe('password');
    expect(host).toBe('domain.com');
    expect(port).toBe(1818);
    expect(database).toBe('database');
  });

  it('accepts a connection object', async () => {
    const client = new Client({
      user: 'username',
      password: 'password',
      host: 'domain.com',
      port: 1818,
      database: 'database'
    });
    // @ts-ignore
    const { user, password, host, port, database } = client;
    expect(user).toBe('username');
    expect(password).toBe('password');
    expect(host).toBe('domain.com');
    expect(port).toBe(1818);
    expect(database).toBe('database');
  });

  it('uses defaults when values are not supplied', async () => {
    const client = new Client();
    // @ts-ignore
    const { user, password, host, port, database } = client;
    expect(user).toBe(defaults.user);
    expect(password).toBe(undefined);
    expect(host).toBe('localhost');
    expect(port).toBe(1818);
    expect(database).toBe(undefined);
  });
});

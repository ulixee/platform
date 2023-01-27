import ConnectionString from './ConnectionString';
import defaults from './defaults';

export default class ConnectionParameters {
  user: string;
  password: string;
  database: string;
  port: number;
  host: string;

  constructor(config) {
    // if a string is passed, it is a raw connection string so we parse it into a config
    config = typeof config === 'string' ? ConnectionString.parse(config) : config || {};

    // if the config has a connectionString defined, parse IT into the config we use
    // this will override other default values with what is stored in connectionString
    if (config.connectionString) {
      config = { ...config, ...ConnectionString.parse(config.connectionString) };
    }

    this.user = config.user || defaults.user;
    this.password = config.password || defaults.password;
    this.database = config.database || defaults.database;

    this.port = parseInt(config.port || defaults.port, 10);
    this.host = config.host || defaults.host;

    // "hiding" the password so it doesn't show up in stack traces
    // or if the client is console.logged
    Object.defineProperty(this, 'password', {
      configurable: true,
      enumerable: false,
      writable: true,
      value: config.password || defaults.password,
    });
  }
}

import ConnectionString from '@ulixee/client-connection-string';
import defaults from './defaults';

export default class ConnectionParameters {
  user: string;
  password: string;
  database: string;
  port: number;
  host: string;
  binary: string;
  options: any;
  query_timeout: string | number;
  connect_timeout: string | number;

  constructor(config) {
    // if a string is passed, it is a raw connection string so we parse it into a config
    config = typeof config === 'string' ? ConnectionString.parse(config) : config || {};

    // if the config has a connectionString defined, parse IT into the config we use
    // this will override other default values with what is stored in connectionString
    if (config.connectionString) {
      config = { ...config, ...ConnectionString.parse(config.connectionString) };
    }

    this.user = val('username', config) || val('user', config);
    this.password = val('password', config);
    this.database = val('database', config);

    this.port = parseInt(val('port', config), 10);
    this.host = val('host', config);

    // "hiding" the password so it doesn't show up in stack traces
    // or if the client is console.logged
    Object.defineProperty(this, 'password', {
      configurable: true,
      enumerable: false,
      writable: true,
      value: val('password', config),
    })

    this.binary = val('binary', config)
    this.options = val('options', config)

    this.query_timeout = val('query_timeout', config, false)

    if (config.connectionTimeoutMillis === undefined) {
      this.connect_timeout = process.env.ULX_CONNECT_TIMEOUT || 0
    } else {
      this.connect_timeout = Math.floor(config.connectionTimeoutMillis / 1000)
    }
  }
}


function val(key: string, config: any, envVar?: string | boolean): string {
  if (envVar === undefined) {
    envVar = process.env[`ULX_${key.toUpperCase()}`];
  } else if (envVar === false) {
    // do nothing ... use false
  } else {
    envVar = process.env[envVar as string]
  }

  return config[key] || envVar || defaults[key]
}

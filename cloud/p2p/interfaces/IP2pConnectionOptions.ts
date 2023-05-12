import Identity from '@ulixee/crypto/lib/Identity';

export default interface IP2pConnectionOptions {
  identity: Identity;
  port: number;
  ulixeeApiHost: string;
  ipOrDomain?: string;
  dbPath?: string;
}

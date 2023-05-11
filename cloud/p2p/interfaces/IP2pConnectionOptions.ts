import Identity from '@ulixee/crypto/lib/Identity';

export default interface IP2pConnectionOptions {
  identity: Identity;
  port: number;
  ipOrDomain?: string;
  ulixeeApiHost: string;
  dbPath?: string;
}

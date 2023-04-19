import { Client } from './Client';

export default interface ICloudConnection {
  name: string;
  type: 'local' | 'public' | 'private';
  adminIdentity?: string;
  nodes: number;
  datastores: number;
  clientsByAddress: Map<string, Client<'desktop'>>;
}

import { Client } from './Client';

export default interface ICloudConnection {
  name: string;
  type: 'local' | 'public' | 'private';
  clientsByAddress: Map<string, Client<'desktop'>>;
}

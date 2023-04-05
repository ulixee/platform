import { IBoundLog } from '@ulixee/commons/interfaces/ILog';

export default interface ICloudApiContext {
  logger: IBoundLog;
  cloudNodes: number;
  connectedNodes: number;
  version: string;
}

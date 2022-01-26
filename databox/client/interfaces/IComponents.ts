import DataboxInteracting from '../lib/DataboxInteracting';
import IExtractParams from './IExtractParams';

export default interface IComponents {
  interact?: IInteractFn;
  extract?: IExtractFn;
  schema?: any;
}

export type IInteractFn = (databox: DataboxInteracting) => void | Promise<void>;
export type IExtractFn = (extract: IExtractParams) => void | Promise<void>;

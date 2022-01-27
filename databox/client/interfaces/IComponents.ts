import Interactor from '../lib/Interactor';
import Extractor from '../lib/Extractor';

export default interface IComponents {
  interact?: IInteractFn;
  extract?: IExtractFn;
  schema?: any;
}

export type IInteractFn = (databox: Interactor) => void | Promise<void>;
export type IExtractFn = (extract: Extractor) => void | Promise<void>;

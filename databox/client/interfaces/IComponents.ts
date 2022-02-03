import Runner from '../lib/Runner';
import Extractor from '../lib/Extractor';

export default interface IComponents {
  run?: IRunFn;
  extract?: IExtractFn;
  schema?: any;
}

export type IRunFn = (databox: Runner) => void | Promise<void>;
export type IExtractFn = (databox: Extractor) => void | Promise<void>;

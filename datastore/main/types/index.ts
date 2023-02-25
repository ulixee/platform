import IItemInputOutput from '../interfaces/IItemInputOutput';

export default interface ITypes
  extends Record<
    string,
    { 
      runners: Record<string, IItemInputOutput>; 
      tables: Record<string, IItemInputOutput>;
    }
  > {}

import IItemInputOutput from '../interfaces/IItemInputOutput';

export default interface ITypes
  extends Record<
    string,
    { 
      functions: Record<string, IItemInputOutput>; 
      tables: Record<string, IItemInputOutput>;
    }
  > {}

import IFunctionInputOutput from '../interfaces/IFunctionInputOutput';

export default interface ITypes
  extends Record<
    string,
    { functions: Record<string, IFunctionInputOutput>; tables: Record<string, any> }
  > {}

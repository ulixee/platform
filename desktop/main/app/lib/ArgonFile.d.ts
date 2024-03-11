import IArgonFile from '@ulixee/platform-specification/types/IArgonFile';
export { IArgonFile };
declare const _default: {
    createCredit(credit: IArgonFile['credit'], file: string): Promise<void>;
    readFromPath(path: string): Promise<IArgonFile>;
};
export default _default;

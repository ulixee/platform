export default interface IMouseApi {
  state(args: { isMousedown: boolean }): void;
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function IMouseApiStatics(constructor: IMouseApi) {}

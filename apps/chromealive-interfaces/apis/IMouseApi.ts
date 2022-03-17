export default interface IMouseApi {
  state(args: { isMousedown: boolean }): void;
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/explicit-function-return-type
export function IMouseApiStatics(staticClass: IMouseApi) {}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ISessionApiStatics(constructor: INavigationApi) {}

export default interface INavigationApi {
  openAbout(): Promise<void>;
}

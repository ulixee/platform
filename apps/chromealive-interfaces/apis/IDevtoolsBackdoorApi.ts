export default interface IDevtoolsBackdoorApi {
  toggleInspectElementMode(): Promise<void>;
  highlightNode(options: { backendNodeId: number }): Promise<void>;
  hideHighlight(): Promise<void>;
  searchElements(options: { query: string }): Promise<any[]>;
  generateQuerySelector(options: { backendNodeId: number }): Promise<any>;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars,@typescript-eslint/explicit-function-return-type
export function IDevtoolsBackdoorApiStatics(staticClass: IDevtoolsBackdoorApi) {}

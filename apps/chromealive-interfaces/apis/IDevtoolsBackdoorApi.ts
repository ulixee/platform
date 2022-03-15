export function IDevtoolsBackdoorApiStatics() {}

export default interface IDevtoolsBackdoorApi {
  toggleInspectElementMode(): Promise<void>;
  highlightNode(options: { backendNodeId: number }): Promise<void>;
  hideHighlight(): Promise<void>;
  searchElements(options: { query: string }): Promise<any[]>;
  generateQuerySelector(options: { backendNodeId: number }): Promise<any>;
}

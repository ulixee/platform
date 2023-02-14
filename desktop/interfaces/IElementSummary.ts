export default interface IElementSummary {
  nodeType: number;
  backendNodeId?: number; // either objectId or backendNodeId must be set
  objectId?: string;
  nodeName: string;
  localName: string;
  attributes: { name: string; value: string }[];
  hasChildren: boolean;
  nodeValueInternal: any;
}

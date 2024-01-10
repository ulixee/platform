import { z } from '@ulixee/specification';
export declare const NodeInfoSchema: z.ZodObject<{
    nodeId: z.ZodString;
    kadHost: z.ZodString;
    apiHost: z.ZodString;
}, "strip", z.ZodTypeAny, {
    nodeId: string;
    kadHost: string;
    apiHost: string;
}, {
    nodeId: string;
    kadHost: string;
    apiHost: string;
}>;
declare type INodeInfo = z.infer<typeof NodeInfoSchema>;
export default INodeInfo;

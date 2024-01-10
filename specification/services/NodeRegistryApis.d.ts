import { z } from '@ulixee/specification';
import { IZodHandlers, IZodSchemaToApiTypes } from '@ulixee/specification/utils/IZodApi';
declare const CloudNodeMetaSchema: z.ZodObject<{
    nodeId: z.ZodString;
    apiHost: z.ZodString;
    isClusterNode: z.ZodBoolean;
    lastSeenDate: z.ZodDate;
    kadHost: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    nodeId: string;
    apiHost: string;
    isClusterNode: boolean;
    lastSeenDate: Date;
    kadHost?: string | undefined;
}, {
    nodeId: string;
    apiHost: string;
    isClusterNode: boolean;
    lastSeenDate: Date;
    kadHost?: string | undefined;
}>;
export declare const NodeRegistryApiSchemas: {
    'NodeRegistry.register': {
        args: z.ZodObject<Omit<{
            nodeId: z.ZodString;
            apiHost: z.ZodString;
            isClusterNode: z.ZodBoolean;
            lastSeenDate: z.ZodDate;
            kadHost: z.ZodOptional<z.ZodString>;
        }, "isClusterNode" | "lastSeenDate">, "strip", z.ZodTypeAny, {
            nodeId: string;
            apiHost: string;
            kadHost?: string | undefined;
        }, {
            nodeId: string;
            apiHost: string;
            kadHost?: string | undefined;
        }>;
        result: z.ZodObject<{
            nodes: z.ZodArray<z.ZodObject<{
                nodeId: z.ZodString;
                apiHost: z.ZodString;
                isClusterNode: z.ZodBoolean;
                lastSeenDate: z.ZodDate;
                kadHost: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                nodeId: string;
                apiHost: string;
                isClusterNode: boolean;
                lastSeenDate: Date;
                kadHost?: string | undefined;
            }, {
                nodeId: string;
                apiHost: string;
                isClusterNode: boolean;
                lastSeenDate: Date;
                kadHost?: string | undefined;
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            nodes: {
                nodeId: string;
                apiHost: string;
                isClusterNode: boolean;
                lastSeenDate: Date;
                kadHost?: string | undefined;
            }[];
        }, {
            nodes: {
                nodeId: string;
                apiHost: string;
                isClusterNode: boolean;
                lastSeenDate: Date;
                kadHost?: string | undefined;
            }[];
        }>;
    };
    'NodeRegistry.getNodes': {
        args: z.ZodObject<{
            count: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            count: number;
        }, {
            count: number;
        }>;
        result: z.ZodObject<{
            nodes: z.ZodArray<z.ZodObject<{
                nodeId: z.ZodString;
                apiHost: z.ZodString;
                isClusterNode: z.ZodBoolean;
                lastSeenDate: z.ZodDate;
                kadHost: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                nodeId: string;
                apiHost: string;
                isClusterNode: boolean;
                lastSeenDate: Date;
                kadHost?: string | undefined;
            }, {
                nodeId: string;
                apiHost: string;
                isClusterNode: boolean;
                lastSeenDate: Date;
                kadHost?: string | undefined;
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            nodes: {
                nodeId: string;
                apiHost: string;
                isClusterNode: boolean;
                lastSeenDate: Date;
                kadHost?: string | undefined;
            }[];
        }, {
            nodes: {
                nodeId: string;
                apiHost: string;
                isClusterNode: boolean;
                lastSeenDate: Date;
                kadHost?: string | undefined;
            }[];
        }>;
    };
    'NodeRegistry.health': {
        args: z.ZodObject<{
            nodeId: z.ZodString;
            coreMetrics: z.ZodObject<{
                datastoreQueries: z.ZodNumber;
                heroSessions: z.ZodNumber;
                heroPoolSize: z.ZodNumber;
                heroPoolAvailable: z.ZodNumber;
                periodStartTime: z.ZodDate;
            }, "strip", z.ZodTypeAny, {
                datastoreQueries: number;
                heroSessions: number;
                heroPoolSize: number;
                heroPoolAvailable: number;
                periodStartTime: Date;
            }, {
                datastoreQueries: number;
                heroSessions: number;
                heroPoolSize: number;
                heroPoolAvailable: number;
                periodStartTime: Date;
            }>;
            clientConnections: z.ZodNumber;
            peerConnections: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            nodeId: string;
            coreMetrics: {
                datastoreQueries: number;
                heroSessions: number;
                heroPoolSize: number;
                heroPoolAvailable: number;
                periodStartTime: Date;
            };
            clientConnections: number;
            peerConnections: number;
        }, {
            nodeId: string;
            coreMetrics: {
                datastoreQueries: number;
                heroSessions: number;
                heroPoolSize: number;
                heroPoolAvailable: number;
                periodStartTime: Date;
            };
            clientConnections: number;
            peerConnections: number;
        }>;
        result: z.ZodObject<{
            success: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            success: boolean;
        }, {
            success: boolean;
        }>;
    };
};
export declare type ICloudNodeMeta = z.infer<typeof CloudNodeMetaSchema>;
export declare type INodeRegistryApiTypes = IZodSchemaToApiTypes<typeof NodeRegistryApiSchemas>;
export declare type INodeRegistryApis<TContext = any> = IZodHandlers<typeof NodeRegistryApiSchemas, TContext>;
export default INodeRegistryApiTypes;

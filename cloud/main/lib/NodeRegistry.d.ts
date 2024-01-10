import Identity from '@ulixee/crypto/lib/Identity';
import DatastoreCore from '@ulixee/datastore-core';
import HeroCore from '@ulixee/hero-core';
import { ConnectionToCore } from '@ulixee/net';
import { ICloudNodeMeta, INodeRegistryApis } from '@ulixee/platform-specification/services/NodeRegistryApis';
import IKad from '@ulixee/platform-specification/types/IKad';
import NodeRegistryServiceClient from './NodeRegistryServiceClient';
import NodeTracker from './NodeTracker';
import RoutableServer from './RoutableServer';
export default class NodeRegistry {
    private config;
    serviceClient?: NodeRegistryServiceClient;
    nodeMeta: ICloudNodeMeta;
    private readonly kad?;
    private readonly nodeTracker;
    constructor(config: {
        publicServer: RoutableServer;
        serviceClient?: ConnectionToCore<INodeRegistryApis, {}>;
        kad?: IKad;
        nodeTracker: NodeTracker;
        datastoreCore: DatastoreCore;
        heroCore: HeroCore;
    });
    close(): Promise<void>;
    register(identity: Identity): Promise<void>;
    getNodes(count?: number): Promise<ICloudNodeMeta[]>;
    private trackPeer;
}

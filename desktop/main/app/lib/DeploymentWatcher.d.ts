import IDatastoreDeployLogEntry from '@ulixee/datastore-core/interfaces/IDatastoreDeployLogEntry';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
export default class DeploymentWatcher extends TypedEventEmitter<{
    new: IDatastoreDeployLogEntry;
}> {
    deployments: IDatastoreDeployLogEntry[];
    private deploymentFileWatch;
    constructor();
    start(): void;
    stop(): void;
    private checkFile;
}

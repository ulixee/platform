import PeersTable from './PeersTable';
import ProvidersTable from './ProvidersTable';
import RecordsTable from './RecordsTable';
export default class KadDb {
    readonly peers: PeersTable;
    readonly providers: ProvidersTable;
    readonly records: RecordsTable;
    get isOpen(): boolean;
    private db;
    constructor(dbPath: string);
    close(): void;
}

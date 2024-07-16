import { KeystorePasswordOption } from '@ulixee/localchain';
import { IEscrowAllocationStrategy } from '../payments/ArgonReserver';
export default interface ILocalchainConfig {
    mainchainUrl?: string;
    notaryId?: number;
    localchainPath?: string;
    /**
     * Strategy to use to create escrows. Defaults to a 100 query multiplier
     */
    escrowAllocationStrategy?: IEscrowAllocationStrategy;
    /**
     * Must be set to enable vote creation
     */
    votesAddress?: string;
    /**
     * A password, if applicable, to the localchain
     */
    keystorePassword?: KeystorePasswordOption;
    /**
     * Should sync be run automatically, or wait for programmatic execution
     */
    automaticallyRunSync?: boolean;
}

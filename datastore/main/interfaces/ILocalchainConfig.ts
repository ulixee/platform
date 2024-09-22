import { KeystorePasswordOption } from '@argonprotocol/localchain';
import { IChannelHoldAllocationStrategy } from '../payments/ArgonReserver';

export default interface ILocalchainConfig {
  mainchainUrl?: string;
  notaryId?: number;
  localchainPath?: string;
  /**
   * Strategy to use to create channelHolds. Defaults to a 100 query multiplier
   */
  channelHoldAllocationStrategy?: IChannelHoldAllocationStrategy;
  /**
   * Must be set to enable block vote creation. This is the address where block rewards will be sent.
   */
  blockRewardsAddress?: string;
  /**
   * A password, if applicable, to the localchain
   */
  keystorePassword?: KeystorePasswordOption;

  /**
   * Should sync be run automatically, or wait for programmatic execution
   */
  automaticallyRunSync?: boolean;
}

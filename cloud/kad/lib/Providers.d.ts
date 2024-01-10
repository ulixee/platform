/// <reference types="node" />
import IKadOptions from '../interfaces/IKadOptions';
import NodeId from '../interfaces/NodeId';
import type { Kad } from './Kad';
/**
 * This class manages known providers.
 * A provider is a peer that we know to have the content for a given key.
 *
 * Every `cleanupInterval` providers are checked if they
 * are still valid, i.e. younger than the `provideValidity`.
 * If they are not, they are deleted.
 *
 * To ensure the list survives restarts of the daemon,
 * providers are stored in the datastore, but to ensure
 * access is fast there is an LRU cache in front of that.
 */
export declare class Providers {
    private kad;
    private readonly cache;
    private readonly cleanupInterval;
    private readonly provideValidity;
    private readonly syncQueue;
    private started;
    private cleaner?;
    private onExpiredFns;
    constructor(kad: Pick<Kad, 'db'>, init?: IKadOptions['providers']);
    isStarted(): boolean;
    /**
     * Start the provider cleanup service
     */
    start(): Promise<void>;
    onExpire(onProvideExpired: (event: {
        key: Buffer;
        providerNodeId: string;
    }) => Promise<any>): void;
    /**
     * Release any resources.
     */
    stop(): Promise<void>;
    /**
     * Check all providers if they are still valid, and if not delete them
     */
    cleanup(): void;
    /**
     * Add a new provider for the given key
     */
    addProvider(key: Buffer, providerNodeId: NodeId): void;
    /**
     * Get a list of providers for the given key
     */
    getProviders(key: Buffer): NodeId[];
    /**
     * Get the currently known provider peer ids for a given key
     */
    private getProvidersMap;
}

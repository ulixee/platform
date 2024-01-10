export default interface IKadOptions {
    /**
     * How many peers to store in each kBucket (default 20)
     */
    kBucketSize?: number;
    /**
     * How often to query our own NodeId in order to ensure we have a
     * good view on the KAD address space local to our NodeId
     */
    querySelfInterval?: number;
    /**
     * During startup we run the self-query at a shorter interval to ensure
     * the containing node can respond to queries quickly. Set this interval
     * here in ms (default: 1000)
     */
    initialQuerySelfInterval?: number;
    /**
     * After startup by default all queries will be paused until the initial
     * self-query has run and there are some peers in the routing table.
     *
     * Pass true here to disable this behaviour. (default: false)
     */
    allowQueryWithZeroPeers?: boolean;
    /**
     * How long to wait in ms when pinging DHT peers to decide if they
     * should be evicted from the routing table or not (default 10000)
     */
    pingTimeout?: number;
    /**
     * How many peers to ping in parallel when deciding if they should
     * be evicted from the routing table or not (default 10)
     */
    pingConcurrency?: number;
    /**
     * Initialization options for the Providers component
     */
    providers?: {
        cacheSize?: number;
        /**
         * How often invalid records are cleaned. (in seconds)
         */
        cleanupInterval?: number;
        /**
         * How long is a provider valid for. (in seconds)
         */
        provideValidity?: number;
    };
}

export const minute = 60e3;
export const hour = 60 * minute;

export const PROVIDERS_LRU_CACHE_SIZE = 256;

export const PROVIDERS_VALIDITY = 24 * hour;

export const PROVIDERS_CLEANUP_INTERVAL = hour;

// K is the maximum number of requests to perform before returning failure
export const K = 20;

// Alpha is the concurrency for asynchronous requests
export const ALPHA = 3;

// How often we look for our closest DHT neighbours
export const QUERY_SELF_INTERVAL = Number(5 * minute);

// How often we look for the first set of our closest DHT neighbours
export const QUERY_SELF_INITIAL_INTERVAL = Number(1e3);

// How long to look for our closest DHT neighbours for
export const QUERY_SELF_TIMEOUT = Number(5e3);

// How often we try to find new peers
export const TABLE_REFRESH_INTERVAL = Number(5 * minute);

// How how long to look for new peers for
export const TABLE_REFRESH_QUERY_TIMEOUT = Number(30e3);

// When a timeout is not specified, run a query for this long
export const DEFAULT_QUERY_TIMEOUT = Number(30e3);

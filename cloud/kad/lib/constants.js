"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_QUERY_TIMEOUT = exports.TABLE_REFRESH_QUERY_TIMEOUT = exports.TABLE_REFRESH_INTERVAL = exports.QUERY_SELF_TIMEOUT = exports.QUERY_SELF_INITIAL_INTERVAL = exports.QUERY_SELF_INTERVAL = exports.ALPHA = exports.K = exports.PROVIDERS_CLEANUP_INTERVAL = exports.PROVIDERS_VALIDITY = exports.PROVIDERS_LRU_CACHE_SIZE = exports.hour = exports.minute = void 0;
exports.minute = 60e3;
exports.hour = 60 * exports.minute;
exports.PROVIDERS_LRU_CACHE_SIZE = 256;
exports.PROVIDERS_VALIDITY = 24 * exports.hour;
exports.PROVIDERS_CLEANUP_INTERVAL = exports.hour;
// K is the maximum number of requests to perform before returning failure
exports.K = 20;
// Alpha is the concurrency for asynchronous requests
exports.ALPHA = 3;
// How often we look for our closest DHT neighbours
exports.QUERY_SELF_INTERVAL = Number(5 * exports.minute);
// How often we look for the first set of our closest DHT neighbours
exports.QUERY_SELF_INITIAL_INTERVAL = Number(1e3);
// How long to look for our closest DHT neighbours for
exports.QUERY_SELF_TIMEOUT = Number(5e3);
// How often we try to find new peers
exports.TABLE_REFRESH_INTERVAL = Number(5 * exports.minute);
// How how long to look for new peers for
exports.TABLE_REFRESH_QUERY_TIMEOUT = Number(30e3);
// When a timeout is not specified, run a query for this long
exports.DEFAULT_QUERY_TIMEOUT = Number(30e3);
//# sourceMappingURL=constants.js.map
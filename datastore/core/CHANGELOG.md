# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [2.0.0-alpha.18](https://github.com/ulixee/platform/compare/v2.0.0-alpha.17...v2.0.0-alpha.18) (2023-01-17)


### Bug Fixes

* **datastore:** failing private table tests ([e844ebe](https://github.com/ulixee/platform/commit/e844ebeac9d9720a54795066d1f3abf319bafbe7))
* **datastore:** tweak cli to fix end-to-end test ([4355cd1](https://github.com/ulixee/platform/commit/4355cd1f428806e10cbd23d62c4d2c0b970ce30e))


### Features

* **datastore:** affiliateId and embedded credits ([e56a24d](https://github.com/ulixee/platform/commit/e56a24dbd33211f26d120e1c7fd5fc20e6e698a8))
* **datastore:** cli to clone datastores ([cd9fd16](https://github.com/ulixee/platform/commit/cd9fd1641a0299365da4b4c1d6d8a24e2b58b4f5))
* **datastore:** enable credits ([972029e](https://github.com/ulixee/platform/commit/972029e93451e4dddd79f313527f5799aaf11260))
* **datastore:** passthrough tables ([36f4cb6](https://github.com/ulixee/platform/commit/36f4cb6a7122ec0ab517ad051e61b5262d5c99d9))
* **datastore:** shorten version hash length ([0e36ead](https://github.com/ulixee/platform/commit/0e36ead760356addb93340313458b92093e51c1b))





# [2.0.0-alpha.17](https://github.com/ulixee/platform/compare/v2.0.0-alpha.16...v2.0.0-alpha.17) (2022-12-15)


### Bug Fixes

* added some jest mocks ([c915472](https://github.com/ulixee/platform/commit/c915472bccd85bb8385ccbe5419f29a9990d4f9f))
* fixed some tests by ensuring the dir exits before removing ([54c0e4d](https://github.com/ulixee/platform/commit/54c0e4dba27e207507b88be70d485c9dd73b9058))
* resolved some file issues in tests ([a707427](https://github.com/ulixee/platform/commit/a707427db410b03e82240cda516d16a87a2e40e5))


### Features

* added tables + sql ([8be5f7e](https://github.com/ulixee/platform/commit/8be5f7e31ca4c63cbb02f81eb7ca29dbb8e5b2aa))
* added ULX_SERVER_ENVIRONMENT env ([a3b28a6](https://github.com/ulixee/platform/commit/a3b28a68a21378cdccbea1d49b851201cda8db10))
* **datastore:** passthrough functions ([c84ba16](https://github.com/ulixee/platform/commit/c84ba168265ebdb167e6ceeb5e3f6bd116760710))
* finished converting Datastore to SQL ([3765917](https://github.com/ulixee/platform/commit/37659171fe2c5c1488c4ab0209939421894c4e1b))





# [2.0.0-alpha.16](https://github.com/ulixee/platform/compare/v2.0.0-alpha.15...v2.0.0-alpha.16) (2022-12-05)


### Bug Fixes

* node 18 fixes ([cba4510](https://github.com/ulixee/platform/commit/cba45107b038f0538429fa18bf87448140ace5c5))
* tests ([547e189](https://github.com/ulixee/platform/commit/547e189235e022cedbd8be365d742f684341ef2d))


### Features

* allow a datastore function to be auto-wrapped ([57a54ca](https://github.com/ulixee/platform/commit/57a54ca70903751414e49d5bc8fd4d933af788ea))
* convert datastore plugins to new structure ([1705030](https://github.com/ulixee/platform/commit/1705030ec91461b166c9bfafbcc9b1e3c12f0854))
* datastore functions ([b14352d](https://github.com/ulixee/platform/commit/b14352d8160de6667e05bdbf86b6b6df32d056e4))





# [2.0.0-alpha.15](https://github.com/ulixee/platform/compare/v2.0.0-alpha.14...v2.0.0-alpha.15) (2022-11-17)


### Features

* simplified gift cards ([a9ccca7](https://github.com/ulixee/platform/commit/a9ccca76dfaffd789602f3bb3cacac5d5d75c82c))





# [2.0.0-alpha.14](https://github.com/ulixee/platform/compare/v2.0.0-alpha.13...v2.0.0-alpha.14) (2022-11-02)

**Note:** Version bump only for package @ulixee/datastore-core





# [2.0.0-alpha.13](https://github.com/ulixee/ulixee/compare/v2.0.0-alpha.12...v2.0.0-alpha.13) (2022-10-31)


### Features

* add schemas to datastores ([6f49377](https://github.com/ulixee/ulixee/commit/6f493774ebd760e52c7986b2ad3e0b45abab90e8))
* allow installing a datastore schema ([b73da83](https://github.com/ulixee/ulixee/commit/b73da83fc04728d9b575aea541126758e76556ee))
* major simplification of Datastore into a basic version with plugin capabilities ([22ad672](https://github.com/ulixee/ulixee/commit/22ad672e06135049ab82fc8b3af274d9e72c278a))
* publish docker images ([d10ee25](https://github.com/ulixee/ulixee/commit/d10ee257406633805d15d21d7ebd4b043246b6c4))





# [2.0.0-alpha.12](https://github.com/ulixee/ulixee/compare/v2.0.0-alpha.11...v2.0.0-alpha.12) (2022-10-03)

**Note:** Version bump only for package @ulixee/datastore-core





# [2.0.0-alpha.11](https://github.com/ulixee/ulixee/compare/v2.0.0-alpha.10...v2.0.0-alpha.11) (2022-08-31)


### Bug Fixes

* **website:** update algolia search ([992e35a](https://github.com/ulixee/ulixee/commit/992e35aeb4c9a01924820e70010f223cc8c31142))





# [2.0.0-alpha.10](https://github.com/ulixee/ulixee/compare/v2.0.0-alpha.9...v2.0.0-alpha.10) (2022-08-16)


### Features

* **datastore:** invert datastore settings ([e69edf6](https://github.com/ulixee/ulixee/commit/e69edf63453fe2a670b542a7691f4b1cf4c1028c))
* **datastore:** payments ([93af88c](https://github.com/ulixee/ulixee/commit/93af88c9a86115ee13cd6156a50405a26af8de7e))
* end to end scripts (first one is gift cards) ([d737c6b](https://github.com/ulixee/ulixee/commit/d737c6b847ebb017ec1a766ab5d025153b17f331))





# [2.0.0-alpha.9](https://github.com/ulixee/ulixee/compare/v2.0.0-alpha.8...v2.0.0-alpha.9) (2022-07-26)

**Note:** Version bump only for package @ulixee/datastore-core





# [2.0.0-alpha.8](https://github.com/ulixee/ulixee/compare/v2.0.0-alpha.7...v2.0.0-alpha.8) (2022-07-13)


### Bug Fixes

* **datastore:** update hero and hashUtils ([7796d42](https://github.com/ulixee/ulixee/commit/7796d425e99abf93c2b19f5bacee1553d7e0aae7))


### Features

* allow server configuration of hero/datastore ([ac305d9](https://github.com/ulixee/ulixee/commit/ac305d967f414ab4b1f70f9adbfbd5f8b0c9f029))
* **datastore:** dbx package files ([57a067e](https://github.com/ulixee/ulixee/commit/57a067ea3be57516ea58c278dff07e1158c97848))
* **datastore:** deploy command ([2929b43](https://github.com/ulixee/ulixee/commit/2929b43ee34f41fc853623ace966501e5895e879))
* **datastore:** manifest setting overrides ([098126d](https://github.com/ulixee/ulixee/commit/098126d1e075e4378bc6f562739369d52ed5b4a0))
* **datastore:** store dbx files on server ([b331ede](https://github.com/ulixee/ulixee/commit/b331ede711f8539e91cbade5087c6e573aa3f407))





# [2.0.0-alpha.7](https://github.com/ulixee/ulixee/compare/v2.0.0-alpha.6...v2.0.0-alpha.7) (2022-06-28)


### Bug Fixes

* **datastore:** convert run later to boolean ([8a79290](https://github.com/ulixee/ulixee/commit/8a79290e2b67fde0e10e80be44e8745755f2344b))
* fixed some issues that the previous datastore changes broke ([000f106](https://github.com/ulixee/ulixee/commit/000f106a2052c53a963c6cd706195a9508dc6f63))


### Features

* added cores to datastore and for-puppeteer + ability to run local datastore files ([237f1e9](https://github.com/ulixee/ulixee/commit/237f1e941843d8ca71bfc6c74d3bbc7b048f5d6b))
* added package.dist.json to datastore-core ([cc947b4](https://github.com/ulixee/ulixee/commit/cc947b4fc8ac7deca9f294c674a6be560ce95fa1))
* datastores now have core-runtimes ([9a63bd9](https://github.com/ulixee/ulixee/commit/9a63bd9cae3427c71c47cc46d7009b07ae3fed9f))





# [2.0.0-alpha.6](https://github.com/ulixee/ulixee/compare/v2.0.0-alpha.5...v2.0.0-alpha.6) (2022-06-10)

**Note:** Version bump only for package @ulixee/datastore-core





# [2.0.0-alpha.5](https://github.com/ulixee/ulixee/compare/v2.0.0-alpha.3...v2.0.0-alpha.5) (2022-06-10)


### Bug Fixes

* events for chromealive not working ([88ca517](https://github.com/ulixee/ulixee/commit/88ca517875062ef2975eb441e5f3aa9e6bf6b2e6))
* packager tests ([a75162a](https://github.com/ulixee/ulixee/commit/a75162ac5cae234487e96bea1ff5b52f27a931f7))


### Features

* **datastore:** add datastore cores ([36e4fd8](https://github.com/ulixee/ulixee/commit/36e4fd802175985755394751dd09a8ceabc5bfa4))
* playgrounds for hero and datastore-plugins-hero ([34eca22](https://github.com/ulixee/ulixee/commit/34eca2237aa92e73794a3b5ea6bcc6eef41a1572))
* ulixee cli ([767f0a9](https://github.com/ulixee/ulixee/commit/767f0a955587755df2f6a2e7042092023e68f7c6))





# [2.0.0-alpha.4](https://github.com/ulixee/ulixee/compare/v2.0.0-alpha.3...v2.0.0-alpha.4) (2022-06-09)


### Bug Fixes

* packager tests ([a75162a](https://github.com/ulixee/ulixee/commit/a75162ac5cae234487e96bea1ff5b52f27a931f7))


### Features

* **datastore:** add datastore cores ([36e4fd8](https://github.com/ulixee/ulixee/commit/36e4fd802175985755394751dd09a8ceabc5bfa4))
* playgrounds for hero and datastore-plugins-hero ([34eca22](https://github.com/ulixee/ulixee/commit/34eca2237aa92e73794a3b5ea6bcc6eef41a1572))
* ulixee cli ([767f0a9](https://github.com/ulixee/ulixee/commit/767f0a955587755df2f6a2e7042092023e68f7c6))

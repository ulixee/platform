# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [2.0.0-alpha.27](https://github.com/ulixee/platform/compare/v2.0.0-alpha.26...v2.0.0-alpha.27) (2024-03-01)

**Note:** Version bump only for package @ulixee/desktop





# [2.0.0-alpha.26](https://github.com/ulixee/platform/compare/v2.0.0-alpha.25...v2.0.0-alpha.26) (2024-02-02)

**Note:** Version bump only for package @ulixee/desktop

# [2.0.0-alpha.25](https://github.com/ulixee/platform/compare/v2.0.0-alpha.24...v2.0.0-alpha.25) (2023-09-28)

**Note:** Version bump only for package @ulixee/desktop

# [2.0.0-alpha.24](https://github.com/ulixee/platform/compare/v2.0.0-alpha.23...v2.0.0-alpha.24) (2023-08-09)

**Note:** Version bump only for package @ulixee/desktop

# [2.0.0-alpha.23](https://github.com/ulixee/platform/compare/v2.0.0-alpha.22...v2.0.0-alpha.23) (2023-07-07)

### Features

- **datastore:** change urls to be id@version ([903e34b](https://github.com/ulixee/platform/commit/903e34b43d8fb2bca060dc6344453da885fef29a))
- **datastore:** convert to id and semver ([1f5d524](https://github.com/ulixee/platform/commit/1f5d524eed5f7af42e271190994040c2d183f450))

# [2.0.0-alpha.22](https://github.com/ulixee/platform/compare/v2.0.0-alpha.21...v2.0.0-alpha.22) (2023-06-12)

### Features

- **cloud:** add peer network ([9b214de](https://github.com/ulixee/platform/commit/9b214de012f765df3a42aa45b6b92d95d7d68a22))
- **cloud:** registry service configuration ([08e9f71](https://github.com/ulixee/platform/commit/08e9f719f0c242ffbbcc3f09aca334563c9b87b9))
- **datastore:** add duplex connections to kad ([ada47bd](https://github.com/ulixee/platform/commit/ada47bd01e2c894d370011b7eb1296f269fb3e47))
- **datastore:** add migrations ([04542bd](https://github.com/ulixee/platform/commit/04542bdb05bc4250839fdb7b30eb11a2ab20b290))
- **datastore:** cluster replay store ([c0347aa](https://github.com/ulixee/platform/commit/c0347aa4a81c31ac2f80f507cc7a048a360c3561))
- **datastore:** configure storage endpoint ([0fca691](https://github.com/ulixee/platform/commit/0fca6913eb63335c055e5b4c88760092f9c55694))
- **datastore:** upload to storage eng to create ([1453654](https://github.com/ulixee/platform/commit/1453654cc2300fa2735f901545da5cf7e218b3cc))

# [2.0.0-alpha.21](https://github.com/ulixee/platform/compare/v2.0.0-alpha.20...v2.0.0-alpha.21) (2023-04-24)

### Bug Fixes

- **desktop:** vm breaks in packaged electron app ([a5c9f4e](https://github.com/ulixee/platform/commit/a5c9f4ef62120a2807f7b5aa6e829460502ac72c))

# [2.0.0-alpha.20](https://github.com/ulixee/platform/compare/v2.0.0-alpha.19...v2.0.0-alpha.20) (2023-04-20)

### Bug Fixes

- **datastore:** failing tests ([8e3f881](https://github.com/ulixee/platform/commit/8e3f881876a59c2b241806c04260d73e03d37617))
- **datastore:** output rebuilding ([8d10cc7](https://github.com/ulixee/platform/commit/8d10cc7e24cfd1ad65725a3e14dc4a3a2a3d5954))
- **desktop:** binary not loading properly ([3b0b641](https://github.com/ulixee/platform/commit/3b0b6414dbec9a798fba0e802ef06fd8ff790c6e))
- **desktop:** event handling fixes ([841c031](https://github.com/ulixee/platform/commit/841c031a2ec5061ce201b21aeb58ea53c4ac64a8))

### chore

- rename miner to cloud node ([a3c949e](https://github.com/ulixee/platform/commit/a3c949e4af806cc6a4acdd4b4b04305946add19b))

### Features

- **datastore:** add docs ([da39923](https://github.com/ulixee/platform/commit/da39923c0ba5f21359e58a55fc205e82af708e65))
- **desktop:** add datastore details page ([a6bce0b](https://github.com/ulixee/platform/commit/a6bce0b9f5ac1121d37c3029bd8fd20f147e9324))
- **desktop:** getting started guide ([1e3fd87](https://github.com/ulixee/platform/commit/1e3fd87973807e8862a5696421aa768a6cd02bb6))
- **desktop:** log user queries locally ([33fb721](https://github.com/ulixee/platform/commit/33fb7215afca7bde722217a827a82e4b89082a8c))
- **desktop:** query ability on queries tab ([3960c7b](https://github.com/ulixee/platform/commit/3960c7b9fda1f9bea3a81850bb4fdadf9f54b2d4))

### BREAKING CHANGES

- @ulixee/miner package is now @ulixee/cloud.
  You must import {CloudNode} from @ulixee/cloud and use in place of Miner.

# [2.0.0-alpha.19](https://github.com/ulixee/platform/compare/v2.0.0-alpha.17...v2.0.0-alpha.19) (2023-02-25)

### Bug Fixes

- **datastore:** error logging ([7ee3d02](https://github.com/ulixee/platform/commit/7ee3d02076c0ced0dda05c884b25a33236f73d12))
- **desktop:** allow opening external sesison ([5f5e229](https://github.com/ulixee/platform/commit/5f5e229a45f2373f1c3f236aadd7e21b17dbda87))

### Features

- **desktop:** add desktop home page ([d8f5611](https://github.com/ulixee/platform/commit/d8f56110c66a1d290bf28c9e227721716fbe1f7a))
- **desktop:** add pages to home ([76ff239](https://github.com/ulixee/platform/commit/76ff239eeacdd3c03d44ed91781b900e352479a6))
- **desktop:** playback of script ([521d21f](https://github.com/ulixee/platform/commit/521d21faaa769651ad485afee876f09a73dde18e))

# [2.0.0-alpha.18](https://github.com/ulixee/platform/compare/v2.0.0-alpha.17...v2.0.0-alpha.18) (2023-01-17)

**Note:** Version bump only for package @ulixee/apps-desktop

# [2.0.0-alpha.17](https://github.com/ulixee/platform/compare/v2.0.0-alpha.16...v2.0.0-alpha.17) (2022-12-15)

### Features

- **databox:** passthrough functions ([c84ba16](https://github.com/ulixee/platform/commit/c84ba168265ebdb167e6ceeb5e3f6bd116760710))

# [2.0.0-alpha.16](https://github.com/ulixee/platform/compare/v2.0.0-alpha.15...v2.0.0-alpha.16) (2022-12-05)

### Bug Fixes

- tests ([547e189](https://github.com/ulixee/platform/commit/547e189235e022cedbd8be365d742f684341ef2d))

### Features

- databox functions ([b14352d](https://github.com/ulixee/platform/commit/b14352d8160de6667e05bdbf86b6b6df32d056e4))

# [2.0.0-alpha.15](https://github.com/ulixee/platform/compare/v2.0.0-alpha.14...v2.0.0-alpha.15) (2022-11-17)

**Note:** Version bump only for package @ulixee/apps-desktop

# [2.0.0-alpha.14](https://github.com/ulixee/platform/compare/v2.0.0-alpha.13...v2.0.0-alpha.14) (2022-11-02)

**Note:** Version bump only for package @ulixee/apps-desktop

# [2.0.0-alpha.13](https://github.com/ulixee/ulixee/compare/v2.0.0-alpha.12...v2.0.0-alpha.13) (2022-10-31)

### Bug Fixes

- add development mode for desktop app ([603b35e](https://github.com/ulixee/ulixee/commit/603b35e27a1e6b1ea3b14a7b0d29af8cd2c5612a))

# [2.0.0-alpha.12](https://github.com/ulixee/ulixee/compare/v2.0.0-alpha.11...v2.0.0-alpha.12) (2022-10-03)

**Note:** Version bump only for package @ulixee/apps-desktop

# [2.0.0-alpha.11](https://github.com/ulixee/ulixee/compare/v2.0.0-alpha.10...v2.0.0-alpha.11) (2022-08-31)

**Note:** Version bump only for package @ulixee/apps-desktop

# [2.0.0-alpha.10](https://github.com/ulixee/ulixee/compare/v2.0.0-alpha.9...v2.0.0-alpha.10) (2022-08-16)

**Note:** Version bump only for package @ulixee/apps-desktop

# [2.0.0-alpha.9](https://github.com/ulixee/ulixee/compare/v2.0.0-alpha.8...v2.0.0-alpha.9) (2022-07-26)

**Note:** Version bump only for package @ulixee/apps-desktop

# [2.0.0-alpha.8](https://github.com/ulixee/ulixee/compare/v2.0.0-alpha.7...v2.0.0-alpha.8) (2022-07-13)

**Note:** Version bump only for package @ulixee/apps-desktop

# [2.0.0-alpha.7](https://github.com/ulixee/ulixee/compare/v2.0.0-alpha.6...v2.0.0-alpha.7) (2022-06-28)

**Note:** Version bump only for package @ulixee/apps-desktop

# [2.0.0-alpha.6](https://github.com/ulixee/ulixee/compare/v2.0.0-alpha.5...v2.0.0-alpha.6) (2022-06-10)

**Note:** Version bump only for package @ulixee/apps-desktop

# [2.0.0-alpha.5](https://github.com/ulixee/ulixee/compare/v2.0.0-alpha.3...v2.0.0-alpha.5) (2022-06-10)

### Bug Fixes

- events for chromealive not working ([88ca517](https://github.com/ulixee/ulixee/commit/88ca517875062ef2975eb441e5f3aa9e6bf6b2e6))

### Features

- **databox:** add databox cores ([36e4fd8](https://github.com/ulixee/ulixee/commit/36e4fd802175985755394751dd09a8ceabc5bfa4))

# [2.0.0-alpha.4](https://github.com/ulixee/ulixee/compare/v2.0.0-alpha.3...v2.0.0-alpha.4) (2022-06-09)

### Features

- **databox:** add databox cores ([36e4fd8](https://github.com/ulixee/ulixee/commit/36e4fd802175985755394751dd09a8ceabc5bfa4))

# [2.0.0-alpha.3](https://github.com/ulixee/ulixee/compare/v2.0.0-alpha.2...v2.0.0-alpha.3) (2022-05-19)

**Note:** Version bump only for package @ulixee/apps-desktop

# [2.0.0-alpha.2](https://github.com/ulixee/ulixee/compare/v2.0.0-alpha.1...v2.0.0-alpha.2) (2022-05-17)

**Note:** Version bump only for package @ulixee/apps-desktop

# 2.0.0-alpha.1 (2022-05-16)

### Bug Fixes

- **apps:** configuration order ([6483735](https://github.com/ulixee/ulixee/commit/64837359e2f86b96b529558f05c9a28eb8981b6b))
- **chromealive:** change output location for pkg ([e3b509a](https://github.com/ulixee/ulixee/commit/e3b509a86e61210a15279f2ee035ea942be4fcd7))

### Features

- **apps:** add version to boot ([43cc0db](https://github.com/ulixee/ulixee/commit/43cc0db17fe1ba955ef51cdda5dcc30d0bcfc9de))
- **apps:** automatic server address ([6d60f5e](https://github.com/ulixee/ulixee/commit/6d60f5e4806384cc5255c42439d3946cc1910d6d))
- **apps:** make chromealive “opt-in” ([0419c2b](https://github.com/ulixee/ulixee/commit/0419c2bc2db50856e727bab08b86d33eea5d692f))
- **chromealive:** autoupdate ([b95f86d](https://github.com/ulixee/ulixee/commit/b95f86d1592dac0d73f38cd9032e9c845d79b255))
- convert secret-agent to browser only ([968208f](https://github.com/ulixee/ulixee/commit/968208f0690900dfc641ad4c8fd47b51eef6fa11))
- **server:** automatically track server host ([aa42f4d](https://github.com/ulixee/ulixee/commit/aa42f4df27414928f04c4bd6d074bb17fd23213c))
- unify plugin structure ([ac6c30a](https://github.com/ulixee/ulixee/commit/ac6c30afd518c67b3230ff2109c90d381e21aaec))

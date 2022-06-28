# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [2.0.0-alpha.7](https://github.com/ulixee/ulixee/compare/v2.0.0-alpha.6...v2.0.0-alpha.7) (2022-06-28)


### Bug Fixes

* allow showChromeInterations to be disabled + more accurate error msg if extension isn't found ([b452a71](https://github.com/ulixee/ulixee/commit/b452a71927a81a7cb4b95d1fd16e9228585cbbf0))
* **apps:** page performance tweaks ([f1bc076](https://github.com/ulixee/ulixee/commit/f1bc076f8a31523521d46c49db9fdaf549276474))
* **apps:** remove headers from output page ([a1ebe9a](https://github.com/ulixee/ulixee/commit/a1ebe9ae20df4032e341b49fc85dd258112c6389))
* **apps:** reset source map cache ([0b880d1](https://github.com/ulixee/ulixee/commit/0b880d166021771f74953276ae876fc206b95e5d))
* autorun was not setup correctly after previous databox changes ([1fe0c02](https://github.com/ulixee/ulixee/commit/1fe0c027c5ef6f1cbd8f8a11f48d23e0edc97182))
* change ULX_DATABOX_DISABLE_AUTORUN values to be boolean ([3dd2d0a](https://github.com/ulixee/ulixee/commit/3dd2d0adc8ade84c80193ebdadbe8e850f13c712))
* **chromealive:** pipe output ([e49113c](https://github.com/ulixee/ulixee/commit/e49113c25a92bcb274fcead17682d64ef67b9da9))
* **cli:** arg parsing wrong when values needed ([b79d9c6](https://github.com/ulixee/ulixee/commit/b79d9c6869b0b3a17b2bdf3d4b1b5b0140f62309))
* **databox:** chromealive properly resumes databox ([34b7dcf](https://github.com/ulixee/ulixee/commit/34b7dcfdbef91fdbd245679e1dec86d7cb76c024))
* **databox:** convert run later to boolean ([8a79290](https://github.com/ulixee/ulixee/commit/8a79290e2b67fde0e10e80be44e8745755f2344b))
* **databox:** log errors connecting to core ([e9093d0](https://github.com/ulixee/ulixee/commit/e9093d07b7f888c591ff3d9a9e4af66650548d93))
* fixed some issues that the previous databox changes broke ([000f106](https://github.com/ulixee/ulixee/commit/000f106a2052c53a963c6cd706195a9508dc6f63))
* moved ULX_DATABOX_DISABLE_AUTORUN check into databox constructors ([49b2935](https://github.com/ulixee/ulixee/commit/49b29359767bf40ab7d83f1547fd03f0e603f706))
* **playground:** server not shutting down ([e35606c](https://github.com/ulixee/ulixee/commit/e35606c2de1b7bf8605c06233a9fee0bcfa61074))


### Features

* added @ulixee/databox as a standalone tool + databox-for-puppeteer ([94ddf8d](https://github.com/ulixee/ulixee/commit/94ddf8d24c93b12a5b81596a6db12e60016a110e))
* added cores to databox and for-puppeteer + ability to run local databox files ([237f1e9](https://github.com/ulixee/ulixee/commit/237f1e941843d8ca71bfc6c74d3bbc7b048f5d6b))
* added package.dist.json to databox-core ([cc947b4](https://github.com/ulixee/ulixee/commit/cc947b4fc8ac7deca9f294c674a6be560ce95fa1))
* **apps:** save selectors ([dd7bcfd](https://github.com/ulixee/ulixee/commit/dd7bcfd55281088f14e5e8e5f7649f5845379ba2))
* **chromealive:** restarting session mode ([34dee09](https://github.com/ulixee/ulixee/commit/34dee095b0e7e32b2988d604be7cef341332bd79))
* **databox:** better error stacks (no library) ([ab27163](https://github.com/ulixee/ulixee/commit/ab2716373d0d9379d8d9a6fcd0f307c7647346eb))
* databoxes now have core-runtimes ([9a63bd9](https://github.com/ulixee/ulixee/commit/9a63bd9cae3427c71c47cc46d7009b07ae3fed9f))
* every databox core-runtime should check whether databox version is satisfied ([053032f](https://github.com/ulixee/ulixee/commit/053032f1a78d2b9af674baf86f69ebce459c1f46))





# [2.0.0-alpha.6](https://github.com/ulixee/ulixee/compare/v2.0.0-alpha.5...v2.0.0-alpha.6) (2022-06-10)


### Bug Fixes

* abort attemptAutorun of databox if no default databox was found ([ce16e75](https://github.com/ulixee/ulixee/commit/ce16e753b98251e3e47b4d05d6651130c61d7de4))
* hero-playground ts not including index.js ([89360b0](https://github.com/ulixee/ulixee/commit/89360b000435ec957ce36dde6aff7e33fd00198a))





# [2.0.0-alpha.5](https://github.com/ulixee/ulixee/compare/v2.0.0-alpha.3...v2.0.0-alpha.5) (2022-06-10)


### Bug Fixes

* allow docs to build + styled contribution pages + fixed hero example code ([aa9b578](https://github.com/ulixee/ulixee/commit/aa9b578cf81d3bfd1eaad4169fa09fa2302bf187))
* broken databox test ([81fa421](https://github.com/ulixee/ulixee/commit/81fa42177e335c61c1f35fe645eb4f3bd15701fd))
* corrected doc links ([51b7f18](https://github.com/ulixee/ulixee/commit/51b7f1835287c7456d9f2d3217f24dfbbe1db8b9))
* events for chromealive not working ([88ca517](https://github.com/ulixee/ulixee/commit/88ca517875062ef2975eb441e5f3aa9e6bf6b2e6))
* lint ([496b8dc](https://github.com/ulixee/ulixee/commit/496b8dcb3a84c36279fce6e50ee14a710e1e2198))
* packager tests ([a75162a](https://github.com/ulixee/ulixee/commit/a75162ac5cae234487e96bea1ff5b52f27a931f7))
* updated website data generator to get ready for stream ([41c95fd](https://github.com/ulixee/ulixee/commit/41c95fd31483229b73739ad17c16505112e377b8))


### Features

* added new website ([1b749d1](https://github.com/ulixee/ulixee/commit/1b749d1aa93c47032b7133678916648b6d8d7a43))
* **databox:** add databox cores ([36e4fd8](https://github.com/ulixee/ulixee/commit/36e4fd802175985755394751dd09a8ceabc5bfa4))
* **databox:** packaging ([4303a87](https://github.com/ulixee/ulixee/commit/4303a8731ab3aaa6d3f5f859e760948c54305e69))
* playgrounds for hero and databox-for-hero ([34eca22](https://github.com/ulixee/ulixee/commit/34eca2237aa92e73794a3b5ea6bcc6eef41a1572))
* removed old docs website ([00a95d1](https://github.com/ulixee/ulixee/commit/00a95d19f80622c0b6fb246ed5bc4c97a2767e1f))
* renamed DataboxPackage.ts in databox/for-hero to DataboxWrapper.ts ([cfc625e](https://github.com/ulixee/ulixee/commit/cfc625ef8adffc9967429a24cabe8d0872d29263))
* ulixee cli ([767f0a9](https://github.com/ulixee/ulixee/commit/767f0a955587755df2f6a2e7042092023e68f7c6))





# [2.0.0-alpha.4](https://github.com/ulixee/ulixee/compare/v2.0.0-alpha.3...v2.0.0-alpha.4) (2022-06-09)


### Bug Fixes

* allow docs to build + styled contribution pages + fixed hero example code ([aa9b578](https://github.com/ulixee/ulixee/commit/aa9b578cf81d3bfd1eaad4169fa09fa2302bf187))
* broken databox test ([81fa421](https://github.com/ulixee/ulixee/commit/81fa42177e335c61c1f35fe645eb4f3bd15701fd))
* corrected doc links ([51b7f18](https://github.com/ulixee/ulixee/commit/51b7f1835287c7456d9f2d3217f24dfbbe1db8b9))
* lint ([496b8dc](https://github.com/ulixee/ulixee/commit/496b8dcb3a84c36279fce6e50ee14a710e1e2198))
* packager tests ([a75162a](https://github.com/ulixee/ulixee/commit/a75162ac5cae234487e96bea1ff5b52f27a931f7))
* updated website data generator to get ready for stream ([41c95fd](https://github.com/ulixee/ulixee/commit/41c95fd31483229b73739ad17c16505112e377b8))


### Features

* added new website ([1b749d1](https://github.com/ulixee/ulixee/commit/1b749d1aa93c47032b7133678916648b6d8d7a43))
* **databox:** add databox cores ([36e4fd8](https://github.com/ulixee/ulixee/commit/36e4fd802175985755394751dd09a8ceabc5bfa4))
* **databox:** packaging ([4303a87](https://github.com/ulixee/ulixee/commit/4303a8731ab3aaa6d3f5f859e760948c54305e69))
* playgrounds for hero and databox-for-hero ([34eca22](https://github.com/ulixee/ulixee/commit/34eca2237aa92e73794a3b5ea6bcc6eef41a1572))
* removed old docs website ([00a95d1](https://github.com/ulixee/ulixee/commit/00a95d19f80622c0b6fb246ed5bc4c97a2767e1f))
* renamed DataboxPackage.ts in databox/for-hero to DataboxWrapper.ts ([cfc625e](https://github.com/ulixee/ulixee/commit/cfc625ef8adffc9967429a24cabe8d0872d29263))
* ulixee cli ([767f0a9](https://github.com/ulixee/ulixee/commit/767f0a955587755df2f6a2e7042092023e68f7c6))





# [2.0.0-alpha.3](https://github.com/ulixee/ulixee/compare/v2.0.0-alpha.2...v2.0.0-alpha.3) (2022-05-19)

**Note:** Version bump only for package @ulixee/ulixee-monorepo





# [2.0.0-alpha.2](https://github.com/ulixee/ulixee/compare/v2.0.0-alpha.1...v2.0.0-alpha.2) (2022-05-17)


### Bug Fixes

* databox tsconfig for distro ([98886e9](https://github.com/ulixee/ulixee/commit/98886e918d3ef8a6b04d44b864411fc0bcf8e0fc))





# 2.0.0-alpha.1 (2022-05-16)


### Bug Fixes

* a few very tiny but important changes ([370e29a](https://github.com/ulixee/ulixee/commit/370e29af468cbbe13a6c5ddfb16111e187b08e5d))
* **apps:** configuration order ([6483735](https://github.com/ulixee/ulixee/commit/64837359e2f86b96b529558f05c9a28eb8981b6b))
* await databoxInternal.execExtractor so any errors inside extract are caught ([a381010](https://github.com/ulixee/ulixee/commit/a3810103f902ad839a0e0e017dc9076b9db088fd))
* boss package including compiled chromealive ([e70ebc5](https://github.com/ulixee/ulixee/commit/e70ebc5d4d51e4aa4d725b624c6ac661ed3d5fcb))
* **chromealive:** allow selecting a range on bar ([3daa0a1](https://github.com/ulixee/ulixee/commit/3daa0a1bb60ec06c996a7cc14f52cd7e93753aee))
* **chromealive:** change output location for pkg ([e3b509a](https://github.com/ulixee/ulixee/commit/e3b509a86e61210a15279f2ee035ea942be4fcd7))
* **chromealive:** change top position on hide ([c4d88fc](https://github.com/ulixee/ulixee/commit/c4d88fce534cbc21b1e4de0e2ec4f1df651b8531))
* **chromealive:** child windows messing up hide ([1840ccc](https://github.com/ulixee/ulixee/commit/1840cccfbd9a27ac801949d222962ce36ee83695))
* **chromealive:** date parsing broken ([59a6462](https://github.com/ulixee/ulixee/commit/59a646227e9e297af7ece96534ccb65d7dea0c07))
* **chromealive:** finder focus and tabgroup ([cba583d](https://github.com/ulixee/ulixee/commit/cba583d875b713d3be22a856791c643988a46360))
* **chromealive:** fix bar positioning and focus ([d47d805](https://github.com/ulixee/ulixee/commit/d47d80514f78f1f92c3bcdcdde6094c1eab28a50))
* **chromealive:** handle screen scale ([c104c21](https://github.com/ulixee/ulixee/commit/c104c21cdfcb8f048e3cdec8f1e89b06f05eaac4))
* **chromealive:** hide toolbar when not in use ([7c961cf](https://github.com/ulixee/ulixee/commit/7c961cf0fde441d1871f1e0cb45df5e8408a781d))
* **chromealive:** improve playbar dragging ([32def57](https://github.com/ulixee/ulixee/commit/32def57948b69dc28206070b2e49cb5f3499458b))
* **chromealive:** launch from boss ([dc7ad0d](https://github.com/ulixee/ulixee/commit/dc7ad0d4247052d937cbfbb5e6f85c6f1dcd0424))
* **chromealive:** output window not wiring up ([f29b486](https://github.com/ulixee/ulixee/commit/f29b4869d7d77b78c7413eb70706e25b3d04a57f))
* **chromealive:** page state generate ticks "snap" ([d3dfdb6](https://github.com/ulixee/ulixee/commit/d3dfdb62e9a1e20bb3910d9779c980147a51694a))
* **chromealive:** playbar jerkiness ([4e2817d](https://github.com/ulixee/ulixee/commit/4e2817d4187ac7adbb37b6ad7e7031c91b68849f))
* **chromealive:** player infinite loops ([788d4bd](https://github.com/ulixee/ulixee/commit/788d4bd1d7a93c6eff442f01eb6574c50386d29e))
* **chromealive:** support multiple page states ([2e98ef6](https://github.com/ulixee/ulixee/commit/2e98ef6f1bbc4de3962aec4022435d9e7e1e8500))
* **chromealive:** tab switching/closing bugs ([fb937e9](https://github.com/ulixee/ulixee/commit/fb937e9879ba1ed20fe7d6edb440f8ae571bd184))
* **chromealive:** timeout clicking active tabs ([6ed6359](https://github.com/ulixee/ulixee/commit/6ed63592cba9a3d153c1f307e493a2b8e3a2668c))
* **chromealive:** various playbar bug fixes ([e521009](https://github.com/ulixee/ulixee/commit/e5210099fd98a2a0cd242c04324ee5d117f24c72))
* **chromealive:** websocket bypass for extension ([09d3886](https://github.com/ulixee/ulixee/commit/09d3886dfbf412c1474ff944c60cd273b9f3137b))
* **commons:** move typeserializer test ([a5aa1b8](https://github.com/ulixee/ulixee/commit/a5aa1b8173a897338896e2bf48bae73397d62d76))
* **commons:** tweak small commons features ([14c7c5f](https://github.com/ulixee/ulixee/commit/14c7c5fcf30f3357298c313a6259e2e3bf87437a))
* **commons:** windows logger package formatting ([8590b08](https://github.com/ulixee/ulixee/commit/8590b08d1fcdf735d37cf92ae60636cf43f9c6bf))
* **databox:** server config ([94e241f](https://github.com/ulixee/ulixee/commit/94e241f015ec9caa4cd3e19fd6a514d2b2e93ada))
* disable selector menu + timeline snapshot recorder ([e29cc4f](https://github.com/ulixee/ulixee/commit/e29cc4f7e527543a471a0cf145dae1453b656127))
* **docs:** remove w3c for docs ([4234da1](https://github.com/ulixee/ulixee/commit/4234da1940c33a330c5d156a4c0caa78b666abb2))
* fixed linting issues + a test bug ([efc875e](https://github.com/ulixee/ulixee/commit/efc875e27404832a567ad7f4055455359f6ec1f0))
* fixed several lint issues ([e283577](https://github.com/ulixee/ulixee/commit/e283577f5aafef2e4253dce75d83dad1543d9d82))
* fixes related to messaging between core and extension ([9010624](https://github.com/ulixee/ulixee/commit/90106247e48b86f0818f4512a7c57f7da13e4993))
* focus lost for non-active tab ([78cf07c](https://github.com/ulixee/ulixee/commit/78cf07ccb677c2aa298a4582e77d3b07c3b68547))
* hero pointer ([13a3b0e](https://github.com/ulixee/ulixee/commit/13a3b0ede11d6ceac925b7e7d492900e61375f49))
* **hero:** cert manager fix ([bf18345](https://github.com/ulixee/ulixee/commit/bf183452e98ad3a2d59b4d6368cf3fc8740314f0))
* **hero:** update submodule pointer ([f174bd7](https://github.com/ulixee/ulixee/commit/f174bd7ce218d4128c27765b3a51ba89978aa7c5))
* input and output tabs now handle empty Session.active commands ([94e5a82](https://github.com/ulixee/ulixee/commit/94e5a82b1a35bf08c8dd1315fa669fbfc6a3c579))
* lint ([d4bcbe1](https://github.com/ulixee/ulixee/commit/d4bcbe13033cbd79727e3f103284f9d3612b1f44))
* lint ([506e9ca](https://github.com/ulixee/ulixee/commit/506e9cadb36f2d289f1431b671be344a7581541c))
* lint ([f7407ac](https://github.com/ulixee/ulixee/commit/f7407ac4e9ea5f5b95643a9e76fd25a26cba0ddf))
* lint not running ([c189a5d](https://github.com/ulixee/ulixee/commit/c189a5d82d7f728808f7e037938e70ddac38d332))
* lint require return types ([a829f3f](https://github.com/ulixee/ulixee/commit/a829f3f150e788618f273c7ccfea0a3088ee41d5))
* **misc:** remove rmdirSync warning ([d3c12dc](https://github.com/ulixee/ulixee/commit/d3c12dca351773b91a8f657d6f62d178466e8d01))
* more lint fixes ([5ab4ce6](https://github.com/ulixee/ulixee/commit/5ab4ce61d4331931b57078c282c5b90482b80aa3))
* no need for a console.log in DataboxInternal ([566a7fd](https://github.com/ulixee/ulixee/commit/566a7fdf565c3ca3e9519517e091171e5807191d))
* **pagestate:** adjust dom changes to be aggregate ([4b1b3a6](https://github.com/ulixee/ulixee/commit/4b1b3a61eb6752a15d231db10bcddcd977c0f21f))
* **pagestate:** allow importing state name ([51166f5](https://github.com/ulixee/ulixee/commit/51166f5105dccf07134a357c694b8babf74add5c))
* **pagestate:** convert to panel view ([743d524](https://github.com/ulixee/ulixee/commit/743d524e0d3fb3cc3a20203b26c47ff57c93a844))
* **pagestate:** extend timeline 5s after now ([4b277d6](https://github.com/ulixee/ulixee/commit/4b277d6125b800eeffd2b6220dc94cf521f98dfb))
* **pagestate:** fix select boxes ([d470d0f](https://github.com/ulixee/ulixee/commit/d470d0fdf8d1c9a762ecc116d6130e29f2bd4db2))
* **pagestate:** service worker dying ([9611927](https://github.com/ulixee/ulixee/commit/9611927eedc6e70321ab0f02c083504a47d203bb))
* removed console.log, added back Statics decorators + capitalized TODOs ([98298f5](https://github.com/ulixee/ulixee/commit/98298f5ddb01bf334b3efa5f01b2a5e3fb1615d6))
* removed imports that weren't being used ([7b2f9f2](https://github.com/ulixee/ulixee/commit/7b2f9f2883445470a40731cb8e44290d32e45d29))
* removed input from UI + removed old databox repo from boss/copySources ([7705e14](https://github.com/ulixee/ulixee/commit/7705e149d16fc485680b9dbcd9a68a44f6921325))
* removed some unneeded comments ([0cc6e03](https://github.com/ulixee/ulixee/commit/0cc6e0388b21788d54b35318ff79f00d315820ca))
* removed usage of commons util createPromise from chromealive extension ([6f4155a](https://github.com/ulixee/ulixee/commit/6f4155aa5745fdde82e1b0c069282bbb676e6fa2))
* renamed chromealive-extension Index.vue to index.vue ([ba85973](https://github.com/ulixee/ulixee/commit/ba8597330ca74bf9ba6d0d496dc26038b0fb04c0))
* renamed getMetaObjects to getRawDetails ([4a7e025](https://github.com/ulixee/ulixee/commit/4a7e02532965cadf6bbe8676a5167e39d3df52cb))
* second arg for browserEmitter event should be string ([a075571](https://github.com/ulixee/ulixee/commit/a0755711cdf53ff1a912f0bab051d6c0ba19edfd))
* sourceLoader test broken ([f68fba8](https://github.com/ulixee/ulixee/commit/f68fba842321b675454fb28300c618b0d394e788))
* **stacks:** don't undo stack traces ([5e72271](https://github.com/ulixee/ulixee/commit/5e7227102d6fe3f58807db1b04de3531d891bead))
* tests ([b2cc8a7](https://github.com/ulixee/ulixee/commit/b2cc8a726b05ff6e5886b03edd150060145ee05d))
* **timeline:** differentiate nav start vs receive ([dc3fd12](https://github.com/ulixee/ulixee/commit/dc3fd12b5cef8e06ed1f234585fe17c2f1718def))
* **timetravel:** catch canceled queued loads ([95d27ea](https://github.com/ulixee/ulixee/commit/95d27ea13c8735096726df21433fd2ac02826b49))
* update dependencies, hero/databox pointer ([b1e0e65](https://github.com/ulixee/ulixee/commit/b1e0e65ef7ec0e3d79195884c64af22ac3bab1a8))
* update timeline recorder ([623d6c9](https://github.com/ulixee/ulixee/commit/623d6c9f3bdcafb52754acc10a368680f7c1ac1c))
* updated packages to get latest electron working + small ui fixes to toolbar ([4ab5857](https://github.com/ulixee/ulixee/commit/4ab5857ee0e7ac498249665be4cbbea97f34cd91))
* upgraded sass-loader ([e8be904](https://github.com/ulixee/ulixee/commit/e8be9046fd836eede5c85f4d56e78ceaf242f2ed))
* workspaces wildcards need two asterisks instead of one ([cd7e2a9](https://github.com/ulixee/ulixee/commit/cd7e2a946c757738a19a9c72f5b938185834f939))


### Features

* add logs to boss ([af1905f](https://github.com/ulixee/ulixee/commit/af1905f408df9e1d071ec3cd9e360f1867e413a5))
* added  to databox + renamed interact fn to run ([687317e](https://github.com/ulixee/ulixee/commit/687317e2dfb662be1c52c28c7efa7d3d074c992e))
* added a working databox ([53628c5](https://github.com/ulixee/ulixee/commit/53628c56103c59c962d9d3a76eb51c682e06244b))
* added basic UI structure and messaging architecture for selector-generator ([00bfab0](https://github.com/ulixee/ulixee/commit/00bfab0574086be3b090ddc20266ba9bcf7460f4))
* added chromealive-ui structures for screens and menus ([19ee561](https://github.com/ulixee/ulixee/commit/19ee561092689628831a49ac583c3c40e9e57076))
* added elem. support in databox ([3950434](https://github.com/ulixee/ulixee/commit/39504349d1c80d9b90ebce3dad36a9b581cd1948))
* added files ([f2b5509](https://github.com/ulixee/ulixee/commit/f2b55099ab3388d58be9741350b75955d4125d3a))
* added plugins option on Databox ([58bbcb2](https://github.com/ulixee/ulixee/commit/58bbcb23a2feddb818b4c426e30cb83600d94d05))
* added submodules ([6f97e86](https://github.com/ulixee/ulixee/commit/6f97e86bd876bddc9fe8cab0a3ebdf08913c8dae))
* added typed input/output to databox + other improvements ([1cbbe50](https://github.com/ulixee/ulixee/commit/1cbbe507348e9fec33d86429b3e1f3d9a16502a0))
* added versionCheck.ts to keep @ulixee/* version in sync ([83a5022](https://github.com/ulixee/ulixee/commit/83a50221006d24bd10d5c20d47c48a30cc8d2258))
* **apps:** add version to boot ([43cc0db](https://github.com/ulixee/ulixee/commit/43cc0db17fe1ba955ef51cdda5dcc30d0bcfc9de))
* **apps:** automatic server address ([6d60f5e](https://github.com/ulixee/ulixee/commit/6d60f5e4806384cc5255c42439d3946cc1910d6d))
* **apps:** make chromealive “opt-in” ([0419c2b](https://github.com/ulixee/ulixee/commit/0419c2bc2db50856e727bab08b86d33eea5d692f))
* bring submodules in line ([387f342](https://github.com/ulixee/ulixee/commit/387f342bd990609033989143b8dde58ccfa30f25))
* changed chromealive ui bar to yello ([a3ed3cb](https://github.com/ulixee/ulixee/commit/a3ed3cbbdd839e9b10dc4e1c77467ae52a4c0232))
* chromealive always has a gray dot and toolbar tabs open their screens ([03c5c33](https://github.com/ulixee/ulixee/commit/03c5c33215e7675ae08dc6f3c02cb5dc06129a76))
* **chromealive:** about page for circuit ([1a96d37](https://github.com/ulixee/ulixee/commit/1a96d37df8a5a3cfdf15375e381b4b7616dd96d7))
* **chromealive:** add a mode ([52b70f7](https://github.com/ulixee/ulixee/commit/52b70f7bbd94f1045a89a13d8933af15dcbbeaf2))
* **chromealive:** add databox panel + loading ([d7c7813](https://github.com/ulixee/ulixee/commit/d7c7813ca1a22eef6d7b4b336174693b9fa15f13))
* **chromealive:** add pagestate to ui ([d3b428d](https://github.com/ulixee/ulixee/commit/d3b428d5d1cf1711e396d9e9a1b34ffa537292dc))
* **chromealive:** add step + runs to replay ([3f3247a](https://github.com/ulixee/ulixee/commit/3f3247aab78ed8a8a97f32c21f8debe3dc661841))
* **chromealive:** autoupdate ([b95f86d](https://github.com/ulixee/ulixee/commit/b95f86d1592dac0d73f38cd9032e9c845d79b255))
* **chromealive:** collapse hidden nodes ([8b9112c](https://github.com/ulixee/ulixee/commit/8b9112c428481bfccebc7c986ff6e9cd94fe972a))
* **chromealive:** connect to databox ([83555ec](https://github.com/ulixee/ulixee/commit/83555ece9a57f53630ca244f6e323486241fdd4e))
* **chromealive:** custom message for kept-alive ([fcec203](https://github.com/ulixee/ulixee/commit/fcec203663287245a12c9caf94be1e907b5804fa))
* **chromealive:** elements panel ([503e4d3](https://github.com/ulixee/ulixee/commit/503e4d3e4047cea5a07feda5c56e545719d101ad))
* **chromealive:** finder mode ([d0b1416](https://github.com/ulixee/ulixee/commit/d0b14160c2f38805d290064717c825cdc4c51a18))
* **chromealive:** finder styling, resource search ([6b7f252](https://github.com/ulixee/ulixee/commit/6b7f252e939f53e049a2812cb3bfe050122f652a))
* **chromealive:** fix focus of databox panel ([e67ddcf](https://github.com/ulixee/ulixee/commit/e67ddcf1fa2ad041fcd03cf4206d4c1660f1fdb3))
* **chromealive:** fix mouse events (mac only) ([d09df54](https://github.com/ulixee/ulixee/commit/d09df54a9d7c667ee2901dbb93cc0526ac2a10eb))
* **chromealive:** fix mouse events (mac only) ([26c1029](https://github.com/ulixee/ulixee/commit/26c102965cb1e4f029914ea178ac49f33f46d031))
* **chromealive:** hero script ([c3d093c](https://github.com/ulixee/ulixee/commit/c3d093cd6cb50919f4fe4a882e37b0784b418cf1))
* **chromealive:** input and output screens ([27eabf8](https://github.com/ulixee/ulixee/commit/27eabf82cfe7690be1d4ec73aa6a03c04913e164))
* **chromealive:** menubar styling ([c9db80f](https://github.com/ulixee/ulixee/commit/c9db80f82d6f08bd1bd3e902ef99b98f6954db6a))
* **chromealive:** move timeline over chrome ([f7992ad](https://github.com/ulixee/ulixee/commit/f7992ade9004afc6a36af914d7851154869152b7))
* **chromealive:** nav using hero script lines ([82f9f1b](https://github.com/ulixee/ulixee/commit/82f9f1bde103192b945d116790579d0ecf59b198))
* **chromealive:** new menubar + features ([0131927](https://github.com/ulixee/ulixee/commit/01319278c4a1adf2cc022c6c86b05712fa0f55bc))
* **chromealive:** page state apis ([7f73b0a](https://github.com/ulixee/ulixee/commit/7f73b0ad7bf888241437569051d3f7dbb2f53762))
* **chromealive:** pause/resume script ([2d99aa1](https://github.com/ulixee/ulixee/commit/2d99aa12bb68d7cfd5e1949f696afc5805fb9b4b))
* **chromealive:** separate unassigned worlds ([cfec823](https://github.com/ulixee/ulixee/commit/cfec823a8a5292009ccfe9009ad108905f59dec7))
* **chromealive:** subscribe to commands pause ([38591da](https://github.com/ulixee/ulixee/commit/38591dac69815ee91ee556a79de089ac269811e4))
* **chromealive:** url navigation bar ([0748a4c](https://github.com/ulixee/ulixee/commit/0748a4cc640937863acb00522eadd146bc220095))
* collected snippets ([7ecd540](https://github.com/ulixee/ulixee/commit/7ecd5405b7aec12815d0efc4258a0aa3efdac48a))
* **commons:** source map + code loading support ([ec0bb70](https://github.com/ulixee/ulixee/commit/ec0bb70ff0656535cf4be37db9615d2987909e69))
* **commons:** ulixee config ([b02d3ce](https://github.com/ulixee/ulixee/commit/b02d3ce4dfd04f12f7686711a9ab95c08f02e96b))
* convert pagestate to domstate ([8c7facd](https://github.com/ulixee/ulixee/commit/8c7facdd87fc8f294ac6c16256df32ed3602c736))
* convert secret-agent to browser only ([968208f](https://github.com/ulixee/ulixee/commit/968208f0690900dfc641ad4c8fd47b51eef6fa11))
* coreServerAddress is injected into extension by way of json file ([eed89f4](https://github.com/ulixee/ulixee/commit/eed89f479374072309af396cc44e916729bf6bbb))
* databox and herobox and merged... working with errors ([2d72035](https://github.com/ulixee/ulixee/commit/2d720353f4c442ac03a41b290c1e25bb501cf94a))
* **databox:** update collected resource structure ([54ee183](https://github.com/ulixee/ulixee/commit/54ee183ed8053b486a5a046a7452847985b3c151))
* **docs:** databox + server docs ([c81c62f](https://github.com/ulixee/ulixee/commit/c81c62f0eac976dbfe293ff13156370c59c9731f))
* download chrome on first run ([e083347](https://github.com/ulixee/ulixee/commit/e0833476911440d4bb4f0bedbde79ceb67e7ac49))
* **finder:** added infrastructure needed for the chromealive finder window ([068fae6](https://github.com/ulixee/ulixee/commit/068fae6f7eda4ebc936cd95caa28e33a29a46e39))
* first stage of the new toolbar/timeline ([e69f133](https://github.com/ulixee/ulixee/commit/e69f13360349a06daa825ba97671911b98eb2cb0))
* get collected asset names ([559c4cb](https://github.com/ulixee/ulixee/commit/559c4cb5fb7ae7c349da0c95ba005b8fb551558e))
* good looking but non-working toolbar ([e1c0050](https://github.com/ulixee/ulixee/commit/e1c0050c2d227db62db271d462640783e225dd9d))
* **herobox:** add herobox ([785f801](https://github.com/ulixee/ulixee/commit/785f80128370c7dd40711ab58c1366919af3efb6))
* **herobox:** collected resources ([f2d5bdd](https://github.com/ulixee/ulixee/commit/f2d5bddbaa8f9cb0a374483ba4f8034d0ad30aa6))
* **herobox:** convert collect to by async get ([8e52752](https://github.com/ulixee/ulixee/commit/8e52752c07156de91bf0fd9c676da55b135c9c88))
* **herobox:** synchronous fragments ([2e46083](https://github.com/ulixee/ulixee/commit/2e46083432fd60dfef5f3c5b93e1ff1380329f39))
* **hero:** update hero version ([0bd429a](https://github.com/ulixee/ulixee/commit/0bd429af703611c09c1c3648f6340169446b7006))
* make nseventmonitor optional ([9512870](https://github.com/ulixee/ulixee/commit/95128702719117b57e7c8ec59a6aec0d5b3d8c27))
* merge devtools submodules ([a27ea33](https://github.com/ulixee/ulixee/commit/a27ea339784f0a5a969517571f0d6e21d5dfb52f))
* move chrome into browsers dir ([b43fe8f](https://github.com/ulixee/ulixee/commit/b43fe8ff8e6e615e17cd71ae1da860085363fca7))
* output panel ([3530228](https://github.com/ulixee/ulixee/commit/3530228385db555affb340ebab04145124e450ee))
* **pagestate:** align timeline hovers to ticks ([b340db5](https://github.com/ulixee/ulixee/commit/b340db56bdd2db66525ae026310083b2b8dfa5a4))
* **pagestate:** align timeline hovers to ticks ([a87ae68](https://github.com/ulixee/ulixee/commit/a87ae68e77b0a733a000d7b04c5d592572fbe828))
* **pagestate:** force restart session on updated ([fd74e8f](https://github.com/ulixee/ulixee/commit/fd74e8fe23d488c827870a847b0a8bfc9c8ebe8d))
* **pagestate:** give a name to pagestates ([27fd67d](https://github.com/ulixee/ulixee/commit/27fd67da8b30d712873940824f2c955c3c552099))
* **pagestate:** storage tracking ([1abaf29](https://github.com/ulixee/ulixee/commit/1abaf29e8d88fe37dd956b2c0b1b2b858bb97368))
* remove replay from hero ([196be30](https://github.com/ulixee/ulixee/commit/196be30e4d816e3255450b1e8524fe649cbe6363))
* removed databox-core/connections + added new interact/extract structure ([8c18a76](https://github.com/ulixee/ulixee/commit/8c18a76b45284a57b7c80560fcc781317359e38b))
* removed submodule databox ([4b7e768](https://github.com/ulixee/ulixee/commit/4b7e768011a0e0481b67e13d3f11dd9db5d94e2a))
* rename boss to apps and added admin submodules ([3296ab9](https://github.com/ulixee/ulixee/commit/3296ab9f1ac22d7a14abc403516feb8a466bd1af))
* **replay:** add replay dragging to ca! ([ed6023c](https://github.com/ulixee/ulixee/commit/ed6023c0c860fc7082ae69b1577f528fa6da606c))
* rough working version of selector generator ([b257617](https://github.com/ulixee/ulixee/commit/b2576177b4fb2a1ee8e4b18219487978ff201b9f))
* **screen-output:** allow re-running extract ([06ed565](https://github.com/ulixee/ulixee/commit/06ed565e7ff8b01b150a48305b566251c66e7e7b))
* **server:** automatically track server host ([aa42f4d](https://github.com/ulixee/ulixee/commit/aa42f4df27414928f04c4bd6d074bb17fd23213c))
* skip ChromeAlive if production mode is on ([876d10f](https://github.com/ulixee/ulixee/commit/876d10fc9391a0c0d9bd42f75c04558593c5102b))
* **toolbar:** fixed styling of input tab ([f14b046](https://github.com/ulixee/ulixee/commit/f14b046214b0ddc0807dc3fc5148daa2f401dce8))
* **toolbar:** removed AddressField in favor of a more robust Player ([b6d3ea1](https://github.com/ulixee/ulixee/commit/b6d3ea191dac92895c72acd98228f90e42599d85))
* **toolbar:** timetravel icon now toggles when user enters timetravel mode ([8f5b6ea](https://github.com/ulixee/ulixee/commit/8f5b6ea4d95db611c271adc504d012ef146327d9))
* unify plugin structure ([ac6c30a](https://github.com/ulixee/ulixee/commit/ac6c30afd518c67b3230ff2109c90d381e21aaec))
* unify typescript for ulixee project ([697dc2f](https://github.com/ulixee/ulixee/commit/697dc2fa5e4cc9a3064f7bb17253d7ec88f1793c))
* update deps to chromealive ([dcf9aaa](https://github.com/ulixee/ulixee/commit/dcf9aaa653fec6aadc5878dd7a8d3565e151dc26))
* update testing ([aaf339c](https://github.com/ulixee/ulixee/commit/aaf339c2aa810c8303c948c872a03486e8f76396))
* updated examples to use new State syntax + renamed Fragments to Elements ([69ac1ed](https://github.com/ulixee/ulixee/commit/69ac1eded0d40525c2d21603ae39807ac1ed6908))
* updated hero submodule to use new @ulixee/hero ([32edb90](https://github.com/ulixee/ulixee/commit/32edb90f0abeef99170817aa676f141a26f986ee))
* **website:** move docs into hero ([864281a](https://github.com/ulixee/ulixee/commit/864281ab7025d3c5ab287daf84eb5954129f9b72))

<template>
  <nav :class="[isFixed ? 'fixed' : '', isDark ? 'border-black' : 'border-gray-300']" class="MainNav Component w-full top-0 border-b px-5 text-sm z-50" :style="{ backgroundColor }">

    <div @click="toggleSearch" v-if="searchIsActive" class="absolute top-0 left-0 h-full z-40 inset-0 bg-black bg-opacity-30" style="height: calc(100% + 1px)"></div>
    <div class="flex flex-row items-stretch h-[3.25rem]">
      <div v-if="!searchIsActive" class="left-column font-light flex flex-row items-stretch content-center top-[0.5px] text-base">

        <div class="flex flex-row items-stretch">
          <router-link to='/' class="Logo block flex flex-row items-center font-bold mr-5">
            <inline-svg :src="require('@/assets/logos/ulixee.svg')" height="23" class="LOGO" />
            <span class='text-ulixee-purple ml-2 uppercase tracking-[0.13em]'>Ulixee</span>
          </router-link>

          <PopoverGroup class='flex flex-row items-stretch'>
            <ul class="flex flex-row items-center content-center space-x-1 relative">
              <Popover as='li' v-slot="{ open: isOpen, close }">
                <PopoverButton
                  :class="[isOpen ? 'isOpen text-ulixee-darker bg-ulixee-verylight' : 'text-ulixee-purple']"
                  class='font-light group inline-flex items-center hover:text-ulixee-darker hover:bg-ulixee-verylight rounded px-2 py-1 focus:outline-none focus:ring-0'
                  @mouseover="hoverPopover($event, 'datanet', isOpen)"
                  @mouseleave="leavePopover('datanet', close)"
                  @click.prevent="clickPopoverButton($event, 'datanet', close, isOpen)"
                >
                  <span :class="{ isActive: isActiveNav('datanet') }">Datanet</span>
                </PopoverButton>
                <transition
                  enter-active-class="transition ease-out duration-200"
                  enter-from-class="opacity-0 translate-y-1"
                  enter-to-class="opacity-100 translate-y-0"
                  leave-active-class="transition ease-in duration-150"
                  leave-from-class="opacity-100 translate-y-0"
                  leave-to-class="opacity-0 translate-y-1"
                >
                  <PopoverPanel
                    class="absolute z-10 left-0 transform mt-2 px-2 w-screen max-w-4xl sm:px-0"
                    @click.prevent="closePopover($event, close)"
                    @mouseover.prevent="popoverHover = true"
                  >
<!--                    @mouseleave.prevent="leavePopover(close)"-->
                    <div>
                      <div class='triangle' style='top: -24px; left: 25px'></div>
                      <div class="bg-white rounded-lg shadow-xl overflow-hidden p-1" style='border: 1px solid rgba(0,0,0,0.2)'>
                        <section class='Top'>
                          <header>
                            <router-link to='/datanet'>Ulixee’s Datanet</router-link>
                          </header>
                          <p>An open source platform for extracting, structuring, buying, selling and distributing data.</p>
                          <ul>
                            <li>
                              <router-link to='/datanet/overview'>
                                <div class='Icon'>
                                  <inline-svg :src="require('@/assets/menu-icons/overview.svg')" />
                                </div>
                                <span>Overview</span>
                                <ArrowRightIcon class="ArrowRightIcon" />
                              </router-link>
                            </li>
                            <li>
                              <router-link to='/documentation'>
                                <div class='Icon'>
                                  <inline-svg :src="require('@/assets/menu-icons/documentation.svg')" />
                                </div>
                                <span>Documentation</span>
                                <ArrowRightIcon class="ArrowRightIcon" />
                              </router-link>
                            </li>
                            <li disabled>
                              <router-link to='/datanet/getting-started'>
                                <div class='Icon'>
                                  <inline-svg :src="require('@/assets/menu-icons/getting-started.svg')" />
                                </div>
                                <span>Getting Started</span>
                                <ArrowRightIcon class="ArrowRightIcon" />
                              </router-link>
                            </li>
                            <li disabled>
                              <router-link to='/datanet/brokers'>
                                <div class='Icon'>
                                  <inline-svg :src="require('@/assets/menu-icons/data-brokers.svg')" />
                                </div>
                                <span>Data Brokers</span>
                                <ArrowRightIcon class="ArrowRightIcon" />
                              </router-link>
                            </li>
                            <li disabled>
                              <router-link to='/datanet/tools'>
                                <div class='Icon'>
                                  <inline-svg :src="require('@/assets/menu-icons/data-tools.svg')" />
                                </div>
                                <span>Tooling</span>
                                <ArrowRightIcon class="ArrowRightIcon" />
                              </router-link>
                            </li>
                            <li disabled>
                              <router-link to='/datanet/documentation'>
                                <div class='Icon'>
                                  <inline-svg :src="require('@/assets/menu-icons/pricing.svg')" />
                                </div>
                                <span>Pricing</span>
                                <ArrowRightIcon class="ArrowRightIcon" />
                              </router-link>
                            </li>
                          </ul>
                        </section>
                        <div class="pt-5 pb-2 px-5 rounded-b Products HighlightBox">
                          <div class="ToolsHeader border-b pb-2">Tools for Data Extractors</div>
                          <ul class='columns-2'>
                            <li>
                              <router-link to="/documentation/hero">
                                <div class='Icon'>
                                  <inline-svg :src="require('@/assets/tool-icons/hero.svg')" />
                                </div>
                                <div>
                                  <header>
                                    Ulixee Hero
                                    <ArrowRightIcon class="ArrowRightIcon" />
                                  </header>
                                  <p>The programmable web browser that's nearly impossible to block.</p>
                                </div>
                              </router-link>
                            </li>
                            <li>
                              <router-link to="/documentation/desktop">
                                <div class='Icon'>
                                  <inline-svg :src="require('@/assets/tool-icons/desktop.svg')" />
                                </div>
                                <div>
                                  <header>
                                    Ulixee Desktop
                                    <ArrowRightIcon class="ArrowRightIcon" />
                                  </header>
                                  <p>Create, optimize and debug your scripts across multiple envs.</p>
                                </div>
                              </router-link>
                            </li>
                            <li>
                              <router-link to="/documentation/datastore">
                                <div class='Icon'>
                                  <inline-svg :src="require('@/assets/tool-icons/datastore.svg')" />
                                </div>
                                <div>
                                  <header>
                                    Ulixee Datastores
                                    <ArrowRightIcon class="ArrowRightIcon" />
                                  </header>
                                  <p>Package your data scripts as discrete, composable units ready to deploy.</p>
                                </div>
                              </router-link>
                            </li>
                            <li>
                              <router-link to="/documentation/cloud">
                                <div class='Icon'>
                                  <inline-svg :src="require('@/assets/tool-icons/cloud.svg')" />
                                </div>
                                <div>
                                  <header>
                                    Ulixee Cloud
                                    <ArrowRightIcon class="ArrowRightIcon" />
                                  </header>
                                  <p>Easily run and scale your Datastores across production and localhost.</p>
                                </div>
                              </router-link>
                            </li>
                          </ul>
                          <div class="ToolsHeader border-b pb-2">Tools for Data Consumers</div>
                          <ul class='columns-2'>
                            <li>
                              <router-link to="/documentation/client">
                                <div class='Icon'>
                                  <inline-svg :src="require('@/assets/tool-icons/client.svg')" />
                                </div>
                                <div>
                                  <header>
                                    Ulixee Client
                                    <ArrowRightIcon class="ArrowRightIcon" />
                                  </header>
                                  <p>Browse publicly available datasets from around the world.</p>
                                </div>
                              </router-link>
                            </li>
                            <li disabled>
                              <router-link to="/stream">
                                <div class='Icon'>
                                  <inline-svg :src="require('@/assets/tool-icons/stream.svg')" />
                                </div>
                                <div>
                                  <header>
                                    Ulixee Stream
                                    <ArrowRightIcon class="ArrowRightIcon" />
                                  </header>
                                  <p>Integrate Ulixee's public and private datasets into your codebase.</p>
                                </div>
                              </router-link>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </PopoverPanel>
                </transition>
              </Popover>
              <Popover as='li' v-slot="{ open: isOpen, close }">
                <PopoverButton
                  :class="[isOpen ? 'isOpen text-ulixee-darker bg-ulixee-verylight' : 'text-ulixee-purple', 'font-light group inline-flex items-center hover:text-ulixee-darker hover:bg-ulixee-verylight rounded px-2 py-1 focus:outline-none focus:ring-0']"
                  @mouseover="hoverPopover($event, 'mainchain', isOpen)"
                  @mouseleave="leavePopover('mainchain', close)"
                  @click="clickPopoverButton($event, 'mainchain', close, isOpen)"
                >
                  <span :class="{ isActive: isActiveNav('mainchain') }">Mainchain</span>
                </PopoverButton>
                <transition
                  enter-active-class="transition ease-out duration-200"
                  enter-from-class="opacity-0 translate-y-1"
                  enter-to-class="opacity-100 translate-y-0"
                  leave-active-class="transition ease-in duration-150"
                  leave-from-class="opacity-100 translate-y-0"
                  leave-to-class="opacity-0 translate-y-1"
                >
                  <PopoverPanel
                    class="absolute z-10 left-0 transform mt-2 px-2 w-screen max-w-3xl sm:px-0"
                    @click.prevent="closePopover($event, close)"
                    @mouseover.prevent="popoverHover = true"
                    @mouseleave.prevent="leavePopover(close)"
                  >
                    <div>
                      <div class='triangle' style='top: -24px; left: 110px'></div>
                      <div class="bg-white rounded-lg shadow-xl overflow-hidden p-1" style='border: 1px solid rgba(0,0,0,0.2)'>
                        <section class='Top'>
                          <header>
                            <router-link to='/mainchain'>Ulixee’s Mainchain</router-link>
                          </header>
                          <p>A new type of proof-of-work blockchain that is energy efficient and massively scalable.</p>
                          <ul>
                            <li>
                              <router-link to='/mainchain/overview'>
                                <div class='Icon'>
                                  <inline-svg :src="require('@/assets/menu-icons/overview.svg')" />
                                </div>
                                <span>Overview</span>
                                <ArrowRightIcon class="ArrowRightIcon" />
                              </router-link>
                            </li>
                            <li disabled>
                              <router-link to='/documentation/mainchain'>
                                <div class='Icon'>
                                  <inline-svg :src="require('@/assets/menu-icons/documentation.svg')" />
                                </div>
                                <span>Documentation</span>
                                <ArrowRightIcon class="ArrowRightIcon" />
                              </router-link>
                            </li>
                            <li disabled>
                              <router-link to='/mainchain/getting-started'>
                                <div class='Icon'>
                                  <inline-svg :src="require('@/assets/menu-icons/getting-started.svg')" />
                                </div>
                                <span>Getting Started</span>
                                <ArrowRightIcon class="ArrowRightIcon" />
                              </router-link>
                            </li>
                          </ul>
                        </section>

                        <div class="flex flex-row space-x-2">
                          <div class="w-1/2 px-5 py-3 HighlightBox">
                            <div class="ToolsHeader border-b pb-2">Entities of the Mainchain</div>
                            <ul class='Features TypeEntities'>
                              <li disabled>
                                <router-link to="/mainchain/blocks">
                                  <div class='Icon'>
                                    <inline-svg :src="require('@/assets/menu-icons/the-block.svg')" />
                                  </div>
                                  <span>Blocks</span>
                                  <ArrowRightIcon class="ArrowRightIcon" />
                                </router-link>
                              </li>
                              <li disabled>
                                <router-link to="/mainchain/notaries">
                                  <div class='Icon'>
                                    <inline-svg :src="require('@/assets/menu-icons/notary.svg')" />
                                  </div>
                                  <span>Notaries</span>
                                  <ArrowRightIcon class="ArrowRightIcon" />
                                </router-link>
                              </li>
                              <li disabled>
                                <router-link to="/mainchain/miners">
                                  <div class='Icon'>
                                    <inline-svg :src="require('@/assets/menu-icons/miner.svg')" />
                                  </div>
                                  <span>Miners</span>
                                  <ArrowRightIcon class="ArrowRightIcon" />
                                </router-link>
                              </li>
                              <li disabled>
                                <router-link to="/mainchain/domains">
                                  <div class='Icon'>
                                    <inline-svg :src="require('@/assets/menu-icons/kademlia.svg')" />
                                  </div>
                                  <span>Domains</span>
                                  <ArrowRightIcon class="ArrowRightIcon" />
                                </router-link>
                              </li>
                              <li disabled>
                                <router-link to="/mainchain/domains">
                                  <div class='Icon'>
                                    <inline-svg :src="require('@/assets/menu-icons/kademlia.svg')" />
                                  </div>
                                  <span>Vaults</span>
                                  <ArrowRightIcon class="ArrowRightIcon" />
                                </router-link>
                              </li>
                            </ul>
                          </div>
                          <div class="w-1/2 px-5 py-3 HighlightBox">
                            <div class="ToolsHeader border-b pb-2">Algorithms of the Mainchain</div>
                            <ul class='Features'>
                              <li disabled>
                                <router-link to="/mainchain/proof-of-work">
                                  <div class='Icon'>
                                    <inline-svg :src="require('@/assets/menu-icons/proof-of-work.svg')" />
                                  </div>
                                  <span>Proof-of-Work</span>
                                  <ArrowRightIcon class="ArrowRightIcon" />
                                </router-link>
                              </li>
                              <li disabled>
                                <router-link to="/mainchain/proof-of-compute">
                                  <div class='Icon'>
                                    <inline-svg :src="require('@/assets/menu-icons/proof-of-compute.svg')" />
                                  </div>
                                  <span>Proof-of-Compute</span>
                                  <ArrowRightIcon class="ArrowRightIcon" />
                                </router-link>
                              </li>
                              <li disabled>
                                <router-link to="/mainchain/proof-of-query">
                                  <div class='Icon'>
                                    <inline-svg :src="require('@/assets/menu-icons/proof-of-query.svg')" />
                                  </div>
                                  <span>Proof-of-Query</span>
                                  <ArrowRightIcon class="ArrowRightIcon" />
                                </router-link>
                              </li>
                            </ul>
                          </div>
                        </div>
<!--                        <div class='HighlightBox mt-2 text-center py-5'>-->
<!--                          <div class="text-ulixee-purple font-bold pb-2">Read the Whitepaper</div>-->
<!--                          <p>-->
<!--                            Creating a Simpler, More Efficient Blockchain Through the<br />-->
<!--                            Use of Interlocking On-Chain-Off-Block Merkles-->
<!--                          </p>-->
<!--                        </div>-->
                      </div>
                    </div>
                  </PopoverPanel>
                </transition>
              </Popover>
              <Popover as='li' v-slot="{ open: isOpen, close }">
                <PopoverButton
                  :class="[isOpen ? 'isOpen text-ulixee-darker bg-ulixee-verylight' : 'text-ulixee-purple', 'font-light group inline-flex items-center hover:text-ulixee-darker hover:bg-ulixee-verylight rounded px-2 py-1 focus:outline-none focus:ring-0']"
                  @mouseover="hoverPopover($event, 'argon', isOpen)"
                  @mouseleave="leavePopover('argon', close)"
                  @click="clickPopoverButton($event, 'argon', close, isOpen)"
                >
                  <span :class="{ isActive: isActiveNav('argon') }">Argon</span>
                </PopoverButton>
                <transition
                  enter-active-class="transition ease-out duration-200"
                  enter-from-class="opacity-0 translate-y-1"
                  enter-to-class="opacity-100 translate-y-0"
                  leave-active-class="transition ease-in duration-150"
                  leave-from-class="opacity-100 translate-y-0"
                  leave-to-class="opacity-0 translate-y-1"
                >
                  <PopoverPanel
                    class="absolute z-10 left-0 transform mt-2 px-2 w-screen max-w-3xl sm:px-0"
                    @click.prevent="closePopover($event, close)"
                    @mouseover.prevent="popoverHover = true"
                    @mouseleave.prevent="leavePopover(close)"
                  >
                    <div>
                      <div class='triangle' style='top: -24px; left: 190px'></div>
                      <div class="bg-white rounded-lg shadow-xl overflow-hidden p-1" style='border: 1px solid rgba(0,0,0,0.2)'>
                        <section class='Top'>
                          <header>
                            <router-link to='/argon'>Ulixee’s Argon</router-link>
                          </header>
                          <p>A stabler stablecoin that holds stable purchasing power and is immune to death sprials.</p>
                          <ul>
                            <li>
                              <router-link to='/argon/overview'>
                                <div class='Icon'>
                                  <inline-svg :src="require('@/assets/menu-icons/overview.svg')" />
                                </div>
                                <span>Overview</span>
                                <ArrowRightIcon class="ArrowRightIcon" />
                              </router-link>
                            </li>
                            <li disabled>
                              <router-link to='/documentation/argon'>
                                <div class='Icon'>
                                  <inline-svg :src="require('@/assets/menu-icons/documentation.svg')" />
                                </div>
                                <span>Documentation</span>
                                <ArrowRightIcon class="ArrowRightIcon" />
                              </router-link>
                            </li>
                            <li disabled>
                              <router-link to='/argon/getting-started'>
                                <div class='Icon'>
                                  <inline-svg :src="require('@/assets/menu-icons/getting-started.svg')" />
                                </div>
                                <span>Getting Started</span>
                                <ArrowRightIcon class="ArrowRightIcon" />
                              </router-link>
                            </li>
                            <li disabled>
                              <router-link to='/argon/settlement-fees'>
                                <div class='Icon'>
                                  <inline-svg :src="require('@/assets/menu-icons/settlement-fees.svg')" />
                                </div>
                                <span>Payment Fees</span>
                                <ArrowRightIcon class="ArrowRightIcon" />
                              </router-link>
                            </li>
                            <li disabled>
                              <router-link to='/argon/faq'>
                                <div class='Icon'>
                                  <inline-svg :src="require('@/assets/menu-icons/faq.svg')" />
                                </div>
                                <span>Frequent Questions</span>
                                <ArrowRightIcon class="ArrowRightIcon" />
                              </router-link>
                            </li>
                          </ul>
                        </section>

                        <div class="flex flex-row space-x-2">
                          <div class="w-1/2 px-5 py-3 HighlightBox">
                            <div class="ToolsHeader border-b pb-2">Benefits of the Argon</div>
                            <ul class='Features'>
                              <li disabled>
                                <router-link to="/hero">
                                  <div class='Icon'>
                                    <inline-svg :src="require('@/assets/menu-icons/the-block.svg')" />
                                  </div>
                                  <span>Inflation Resistant</span>
                                  <ArrowRightIcon class="ArrowRightIcon" />
                                </router-link>
                              </li>
                              <li disabled>
                                <router-link to="/hero">
                                  <div class='Icon'>
                                    <inline-svg :src="require('@/assets/menu-icons/notary.svg')" />
                                  </div>
                                  <span>CPI-Pegged</span>
                                  <ArrowRightIcon class="ArrowRightIcon" />
                                </router-link>
                              </li>
                              <li disabled>
                                <router-link to="/hero">
                                  <div class='Icon'>
                                    <inline-svg :src="require('@/assets/menu-icons/miner.svg')" />
                                  </div>
                                  <span>Tax-Collateralized</span>
                                  <ArrowRightIcon class="ArrowRightIcon" />
                                </router-link>
                              </li>
                              <li disabled>
                                <router-link to="/hero">
                                  <div class='Icon'>
                                    <inline-svg :src="require('@/assets/menu-icons/kademlia.svg')" />
                                  </div>
                                  <span>Death Spiral Immunity</span>
                                  <ArrowRightIcon class="ArrowRightIcon" />
                                </router-link>
                              </li>
                            </ul>
                          </div>
                          <div class="w-1/2 px-5 py-3 HighlightBox">
                            <div class="ToolsHeader border-b pb-2">Algorithms of the Argon</div>
                            <ul class='Features'>
                              <li disabled>
                                <router-link to="/hero">
                                  <div class='Icon'>
                                    <inline-svg :src="require('@/assets/menu-icons/proof-of-work.svg')" />
                                  </div>
                                  <span>Wage Protector</span>
                                  <ArrowRightIcon class="ArrowRightIcon" />
                                </router-link>
                              </li>
                              <li disabled>
                                <router-link to="/hero">
                                  <div class='Icon'>
                                    <inline-svg :src="require('@/assets/menu-icons/proof-of-compute.svg')" />
                                  </div>
                                  <span>Taxation</span>
                                  <ArrowRightIcon class="ArrowRightIcon" />
                                </router-link>
                              </li>
                              <li disabled>
                                <router-link to="/hero">
                                  <div class='Icon'>
                                    <inline-svg :src="require('@/assets/menu-icons/proof-of-knowledge.svg')" />
                                  </div>
                                  <span>Minting</span>
                                  <ArrowRightIcon class="ArrowRightIcon" />
                                </router-link>
                              </li>
                              <li disabled>
                                <router-link to="/hero">
                                  <div class='Icon'>
                                    <inline-svg :src="require('@/assets/menu-icons/proof-of-query.svg')" />
                                  </div>
                                  <span>CPI Scoring</span>
                                  <ArrowRightIcon class="ArrowRightIcon" />
                                </router-link>
                              </li>
                            </ul>
                          </div>
                        </div>
<!--                        <div class='HighlightBox mt-2 text-center py-5'>-->
<!--                          <inline-svg class='inline' width='30px' :src="require('@/assets/menu-icons/whitepapers.svg')" />-->
<!--                          <div class=''>-->
<!--                            <div class="text-ulixee-purple font-bold">Read Our Whitepapers</div>-->
<!--                            <p>On the Stabilization of Stablecoins</p>-->
<!--                          </div>-->
<!--                        </div>-->
                      </div>
                    </div>
                  </PopoverPanel>
                </transition>
              </Popover>
            </ul>
            <ul class="ml-2 flex flex-row items-center content-center space-x-2 relative">
              <li class='flex flex-row items-center'>
                <span class='bg-slate-300 block h-6' style='width: 1px'></span>
              </li>
              <Popover as='li' v-slot="{ open: isOpen, close }">
                <PopoverButton
                  :class="[isOpen ? 'isOpen text-ulixee-darker bg-ulixee-verylight' : 'text-ulixee-purple', 'font-light group inline-flex items-center hover:text-ulixee-darker hover:bg-ulixee-verylight rounded px-2 py-1 focus:outline-none focus:ring-0']"
                  @mouseover="hoverPopover($event, 'economy', isOpen)"
                  @mouseleave="leavePopover('economy', close)"
                  @click="clickPopoverButton($event, 'economy', close, isOpen)"
                >
                  <span :class="{ isActive: isActiveNav('economy') }">Economy</span>
                </PopoverButton>
                <transition
                  enter-active-class="transition ease-out duration-200"
                  enter-from-class="opacity-0 translate-y-1"
                  enter-to-class="opacity-100 translate-y-0"
                  leave-active-class="transition ease-in duration-150"
                  leave-from-class="opacity-100 translate-y-0"
                  leave-to-class="opacity-0 translate-y-1"
                >
                  <PopoverPanel
                    class="absolute z-10 left-2 transform mt-2 px-2 sm:px-0"
                    @click.prevent="closePopover($event, close)"
                    @mouseover.prevent="popoverHover = true"
                    @mouseleave.prevent="leavePopover(close)"
                  >
                    <div>
                      <div class='triangle' style='top: -24px; left: 30px'></div>
                      <div class="bg-white rounded-lg shadow-xl overflow-hidden py-1 px-1" style='border: 1px solid rgba(0,0,0,0.2)'>
                        <ul class='EconomyLinks flex flex-col whitespace-nowrap'>
                          <li>
                            <router-link to='/economy'>
                              <i><inline-svg :src="require('@/assets/menu-icons/overview.svg')" /></i>
                              Overview
                              <ArrowRightIcon class="ArrowRightIcon" />
                            </router-link>
                          </li>
                          <li class='BorderTop' disabled>
                            <router-link to='/economy/data-pricing'>
                              <i><inline-svg :src="require('@/assets/menu-icons/platform-pricing.svg')" /></i>
                              Platform Pricing
                              <ArrowRightIcon class="ArrowRightIcon" />
                            </router-link>
                          </li>
                          <li class='BorderTop' disabled>
                            <router-link to='/economy/ownership'>
                              <i><inline-svg :src="require('@/assets/menu-icons/global-ownership.svg')" /></i>
                              Global Ownership
                              <ArrowRightIcon class="ArrowRightIcon" />
                            </router-link>
                          </li>
                          <li disabled>
                            <router-link to='/economy/governance'>
                              <i><inline-svg :src="require('@/assets/menu-icons/decentralized-governance.svg')" /></i>
                              Decentralized Governance
                              <ArrowRightIcon class="ArrowRightIcon" />
                            </router-link>
                          </li>
                          <li disabled>
                            <router-link to='/economy/dual-tokens'>
                              <i><inline-svg :src="require('@/assets/menu-icons/bitcoin-stabilization.svg')" /></i>
                              Bitcoin Stabilization
                              <ArrowRightIcon class="ArrowRightIcon" />
                            </router-link>
                          </li>
                          <li class='BorderTop' disabled>
                            <router-link to='/economy/getting-started'>
                              <i><inline-svg :src="require('@/assets/menu-icons/getting-started.svg')" /></i>
                              Getting Started
                              <ArrowRightIcon class="ArrowRightIcon" />
                            </router-link>
                          </li>
                          <li disabled>
                            <router-link to='/economy/developer-grants'>
                              <i><inline-svg :src="require('@/assets/menu-icons/developer-grants.svg')" /></i>
                              Developer Grants
                              <ArrowRightIcon class="ArrowRightIcon" />
                            </router-link>
                          </li>
                          <li class='BorderTop' disabled>
                            <router-link to='/economy/pulse'>
                              <i><inline-svg :src="require('@/assets/menu-icons/network-pulse.svg')" /></i>
                              Network Pulse
                              <ArrowRightIcon class="ArrowRightIcon" />
                            </router-link>
                          </li>
                          <li class='BorderTop' disabled>
                            <router-link to='/economy/community-connections'>
                              <i><inline-svg :src="require('@/assets/menu-icons/community-conversations.svg')" /></i>
                              Community Conversations
                              <ArrowRightIcon class="ArrowRightIcon" />
                            </router-link>
                          </li>
                          <li disabled>
                            <router-link to='/economy/nonprofit-foundation'>
                              <i><inline-svg :src="require('@/assets/menu-icons/nonprofit-foundation.svg')" /></i>
                              Nonprofit Foundation
                              <ArrowRightIcon class="ArrowRightIcon" />
                            </router-link>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </PopoverPanel>
                </transition>
              </Popover>
              <li class='flex flex-row items-center'>
                <span class='bg-slate-300 block h-6' style='width: 1px'></span>
              </li>
              <li class="flex flex-row items-center">
                <router-link to="/documentation" class="no-underline px-2 py-1 hover:text-ulixee-darker hover:bg-ulixee-verylight">
                  <span :class="{ isActive: isActiveNav('documentation') }" class='inline-block'>Documentation</span>
                </router-link>
              </li>
              <li class="flex flex-row items-center">
                <router-link to="/dispatches" class="no-underline px-2 py-1 hover:text-ulixee-darker hover:bg-ulixee-verylight">
                  <span :class="{ isActive: isActiveNav('dispatches') }" class='inline-block'>Dispatches</span>
                </router-link>
              </li>
            </ul>
          </PopoverGroup>
        </div>
      </div>

      <div class="flex-1 flex flex-row items-center justify-end">
<!--        <li>-->
<!--          <div class="px-[2px] border-l border-gray-300">-->
<!--            <router-link to='/pulse/datastores' class="flex flex-row items-center h-[34px] whitespace-nowrap px-3 text-slate-400 text-center rounded hover:bg-ulixee-verylight">-->
<!--              0 Datastores-->
<!--            </router-link>-->
<!--          </div>-->
<!--        </li>-->
<!--        <li>-->
<!--          <div class="px-[2px] border-l border-gray-300">-->
<!--            <router-link to='/pulse/nodes' class="flex flex-row items-center h-[34px] whitespace-nowrap px-3 text-slate-400 text-center rounded hover:bg-ulixee-verylight">-->
<!--              0 Nodes-->
<!--            </router-link>-->
<!--          </div>-->
<!--        </li>-->
        <router-link to='/pulse' title="Pulse of the Network" class="flex flex-row items-center justify-end rounded hover:bg-ulixee-verylight">
          <div>
            <div class="px-[2px] border-l border-gray-300">
              <span class='flex flex-row items-center h-[34px] whitespace-nowrap px-3 text-slate-400 text-center'>
                ₳1.00 = $1.00
              </span>
            </div>
          </div>
          <div v-if='!searchIsActive' class="flex flex-row items-center">
            <div class="px-[2px] border-l border-gray-300">
              <span class="block h-[34px] w-[34px] pt-[5px] text-center rounded hover:bg-ulixee-verylight">
                <inline-svg :src="require('@/assets/menu-icons/pulse.svg')" height="16" class="inline-block relative top-px text-ulixee-purple" />
              </span>
            </div>
          </div>
        </router-link>
        <div v-if='!searchIsActive' class="flex flex-row items-center">
          <div class="px-[2px] border-l border-gray-300">
            <a aria-label="Discord" href="https://discord.gg/tMAycnemHU" class="block h-[34px] w-[34px] pt-[5px] text-center rounded hover:bg-ulixee-verylight" target="_blank" title="Open Discord">
              <inline-svg :src="require('@/assets/logos/discord.svg')" height="23" class="inline-block text-ulixee-purple relative top-0.5" />
            </a>
          </div>
        </div>
        <div v-if='!searchIsActive' class="flex flex-row items-center">
          <div class="px-[2px] border-l border-gray-300">
            <a aria-label="Github" href="https://github.com/ulixee" class="block h-[34px] w-[34px] pt-[5px] text-center rounded hover:bg-ulixee-verylight" target="_blank" title="Open Github">
              <inline-svg :src="require('@/assets/logos/github.svg')" height="24" class="inline-block text-ulixee-purple" />
            </a>
          </div>
        </div>
        <div :class="[searchIsActive ? 'w-full' : '']" class="flex flex-row items-center">
          <div v-if="searchIsActive" class="w-full">
            <Teleport to="body">
              <div @click="toggleSearch" class="fixed inset-0 bg-black bg-opacity-30 transition-opacity h-screen w-screen z-30"></div>
            </Teleport>
            <SearchForm class="px-[2px] relative z-50" />
          </div>
          <div v-else class="px-[2px] border-l border-gray-300">
            <div @click="toggleSearch" class="cursor-pointer block h-[34px] w-[34px] pt-[5px] text-center rounded hover:bg-ulixee-verylight" title="Search">
              <inline-svg :src="require('@/assets/logos/search.svg')" class="inline-block text-ulixee-purple" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>

<script lang="ts">
import * as Vue from "vue";
import { Popover, PopoverButton, PopoverGroup, PopoverPanel } from '@headlessui/vue';
import { ArrowRightIcon } from '@heroicons/vue/24/outline'
import SearchForm from './SearchForm.vue';
import Footer from '@/layouts/Footer.vue';

export default Vue.defineComponent({
  props: {
    showPadding: {
      type: Boolean,
      default: true,
    },
    navBgColor: {
      type: String,
    },
    isFixed: {
      type: Boolean,
      default: true,
    }
  },
  components: {
    ArrowRightIcon,
    Popover,
    PopoverButton,
    PopoverGroup,
    PopoverPanel,
    SearchForm,
    Footer,
  },
  setup(props: any) {
    const popoverHover = Vue.ref(false)
    const popoverTimeout = Vue.ref()

    return {popoverHover,
      popoverTimeout,
      manuallyClosed: {
        datanet: false,
        mainchain: false,
        argon: false,
      },
      searchIsActive: Vue.ref(false),
      isDark: props.navBgColor ? true : false,
      backgroundColor: props.navBgColor ? props.navBgColor : '#FAFBFB',
    }
  },
  methods: {
    toggleSearch() {
      this.searchIsActive = !this.searchIsActive;
    },

    isActiveNav(name: string): boolean {
      if (name === 'datanet' && this.$route.path === '/') return true;
      return this.$route.path.startsWith(`/${name}`);
    },

    clickPopoverButton($event: any, name: string, close: any, isOpen: boolean) {
      if (isOpen) {
        close();
        (this.manuallyClosed as any)[name] = true;
        this.$router.push(`/${name}`);
      } else {
        $event.currentTarget.click()
      }
      $event.stopPropagation();
    },

    hoverPopover($event: any, name: string, isOpen: boolean): void {
      if ((this.manuallyClosed as any)[name]) return;
      this.popoverHover = true
      if (!isOpen) {
        $event.currentTarget.click()
      }
    },

    closePopover($event: any, close: any) {
      (this.manuallyClosed as any)[name] = false;
      this.popoverHover = false;
      close()
    },

    leavePopover(name: string, close: any): void {
      (this.manuallyClosed as any)[name] = false;
      this.popoverHover = false;
      if (this.popoverTimeout) clearTimeout(this.popoverTimeout)
      this.popoverTimeout = setTimeout(() => {
        if (!this.popoverHover) {
          close()
        }
      }, 100)
    }
  }
});
</script>

<style lang="scss">
.MainNav.Component {
  $HighlightBackground: #F9FAFC;

  svg.ArrowRightIcon {
    @apply inline-block w-3 h-3 relative top-[1px] fill-ulixee-purple opacity-0 transition-all duration-500;
  }

  .EconomyLinks {
    a {
      @apply block flex flex-row items-center rounded py-1 pl-4 pr-10;
    }
    a:hover {
      background: $HighlightBackground;
      svg.ArrowRightIcon {
        @apply opacity-100 translate-x-1;
      }
    }
    i {
      @apply inline-block w-5 h-5 mr-2 flex justify-center items-center;
      svg {
        @apply w-full h-full;
      }
    }
    li.BorderTop {
      @apply border-t pt-1 mt-1;
    }
  }
  .isActive {
    position: relative;
    &:after {
      @apply absolute bottom-0 left-0 w-full h-0 border-b-2 border-ulixee-lighter border-dotted bg-transparent opacity-50;
      content: '';
    }
  }
  button:hover, button.isOpen {
    .isActive:after {
      display: none;
    }
  }

  section.Top {
    @apply p-5;
    header {
      @apply font-bold text-lg text-ulixee-purple uppercase tracking-[0.13em];
    }
    p {
      @apply pt-1 pb-2 mb-3 border-b opacity-50;
    }
    ul {
      @apply flex flex-wrap;
      li {
        @apply w-4/12 opacity-75 my-1;
        &:hover {
          @apply opacity-100;
        }
        a {
          @apply flex flex-row items-center p-2;
          &:hover {
            @apply rounded;
            background: $HighlightBackground;
            .Icon {
              @apply opacity-100;
            }
            svg.ArrowRightIcon {
              @apply opacity-100 translate-x-1;
            }
          }
        }
        .Icon {
          @apply w-8 mr-2 opacity-70;
          svg {
            @apply inline;
            path {
              @apply fill-ulixee-purple;
            }
          }
        }
      }
    }
  }

  a {
    text-decoration: none;
  }

  li[disabled] {
    pointer-events: none;
    opacity: 0.3 !important;
  }

  .triangle {
    position: absolute;
    width: 25px;
    height: 25px;
    overflow: hidden;
    pointer-events: none;
    &:before {
      content: '';
      width: 20px;
      height: 20px;
      background: white;
      transform: rotate(45deg);
      display: block;
      left: 2px;
      position: absolute;
      bottom: -10px;
      border: 1px solid rgba(0,0,0,0.2);
      box-shadow: 1px 1px 2px rgba(0,0,0,0.2);
    }
  }

  .ToolsHeader {
    @apply text-[#A6B1C7] font-bold;
  }

  .HighlightBox {
    background: $HighlightBackground;
  }

  ul.Features {
    @apply mt-1 flex flex-row flex-wrap;
    &.TypeEntities {
      li {
        @apply w-1/2;
      }
    }
    li {
      @apply w-full my-2;
    }
    a {
      @apply block flex flex-row items-center p-2 h-10;
      &:hover {
        background: #EEF0F6;
        @apply rounded;
        .Icon {
          @apply opacity-100;
        }
        svg.ArrowRightIcon {
          @apply opacity-100 translate-x-1;
        }
      }
      .Icon {
        @apply min-w-[35px] opacity-70;
        svg {
          @apply inline;
          path {
            @apply fill-ulixee-purple;
          }
        }
      }
    }
  }

  .Products ul {
    @apply mt-3;
    li {
      @apply mb-3;
    }
    a {
      @apply block flex flex-row text-black p-2;
      &:hover {
        background: #EEF0F6;
        @apply rounded;
        .Icon {
          @apply opacity-100;
        }
        svg.ArrowRightIcon {
          @apply opacity-100 translate-x-1;
        }
      }
      .Icon {
        @apply min-w-[35px] opacity-50;
        svg {
          height: 25px;
          @apply inline;
          path {
            @apply fill-ulixee-purple;
          }
        }
      }
      header {
        @apply flex flex-row items-center font-bold text-ulixee-purple;
      }
      p {
        @apply font-light opacity-70;
      }
    }
  }
  .isDark {
    svg.LOGO {
      path {
        fill: #FDCCFF;
      }
    }
    a, button {
      color: #FDCCFF;
    }
  }

  a.Logo {
    text-decoration: none;
  }
}
</style>

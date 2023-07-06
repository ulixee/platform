<template>
  <footer class='FOOTER border-t border-slate-300 text-[#CA98CF]'>
    <div class='flex flex-row py-12 px-32'>
      <div class='COLUMN-LEFT flex flex-col w-8/12'>
        <div class='PRODUCTS flex flex-row space-x-5'>
          <div class='DATANET w-1/3'>
            <header>Datanet</header>
            <div class='HORIZONTAL-LINE my-2'></div>
            <ul class='LIST'>
              <li>
                <router-link to='/datanet/overview'>
                  <span>Overview</span>
                  <ArrowRightIcon class='ArrowRightIcon' />
                </router-link>
              </li>
              <li>
                <router-link to='/datanet/brokers'>
                  <span>Documentation</span>
                  <ArrowRightIcon class='ArrowRightIcon' />
                </router-link>
              </li>
              <li disabled>
                <router-link to='/datanet/getting-started'>
                  <span>Getting Started</span>
                  <ArrowRightIcon class='ArrowRightIcon' />
                </router-link>
              </li>
              <li disabled>
                <router-link to='/datanet/brokers'>
                  <span>Data Brokers</span>
                  <ArrowRightIcon class='ArrowRightIcon' />
                </router-link>
              </li>
              <li disabled>
                <router-link to='/datanet/documentation'>
                  <span>Pricing</span>
                  <ArrowRightIcon class='ArrowRightIcon' />
                </router-link>
              </li>
            </ul>
            <header>Datanet Tools</header>
            <div class='HORIZONTAL-LINE my-2'></div>
            <ul class='LIST'>
              <li>
                <router-link to='/documentation/hero'>
                  <span>Hero</span>
                  <ArrowRightIcon class='ArrowRightIcon' />
                </router-link>
              </li>
              <li>
                <router-link to='/documentation/desktop'>
                  <span>Desktop</span>
                  <ArrowRightIcon class='ArrowRightIcon' />
                </router-link>
              </li>
              <li>
                <router-link to='/documentation/datastore'>
                  <span>Datastores</span>
                  <ArrowRightIcon class='ArrowRightIcon' />
                </router-link>
              </li>
              <li>
                <router-link to='/documentation/cloud'>
                  <span>Cloud</span>
                  <ArrowRightIcon class='ArrowRightIcon' />
                </router-link>
              </li>
              <li>
                <router-link to='/documentation/client'>
                  <span>Client</span>
                  <ArrowRightIcon class='ArrowRightIcon' />
                </router-link>
              </li>
              <li disabled>
                <router-link to='/stream'>
                  <span>Stream</span>
                  <ArrowRightIcon class='ArrowRightIcon' />
                </router-link>
              </li>
            </ul>
          </div>
          <div class='MAINCHAIN w-1/3'>
            <header>Mainchain</header>
            <div class='HORIZONTAL-LINE my-2'></div>
            <ul class='LIST'>
              <li>
                <router-link to='/mainchain/overview'>
                  <span>Overview</span>
                  <ArrowRightIcon class='ArrowRightIcon' />
                </router-link>
              </li>
              <li disabled>
                <router-link to='/documentation/mainchain'>
                  <span>Documentation</span>
                  <ArrowRightIcon class='ArrowRightIcon' />
                </router-link>
              </li>
              <li disabled>
                <router-link to='/mainchain/getting-started'>
                  <span>Getting Started</span>
                  <ArrowRightIcon class='ArrowRightIcon' />
                </router-link>
              </li>
            </ul>
            <header>Mainchain Entities</header>
            <div class='HORIZONTAL-LINE my-2'></div>
            <ul class='LIST'>
              <li disabled>
                <router-link to='/mainchain/blocks'>
                  <span>Blocks</span>
                  <ArrowRightIcon class='ArrowRightIcon' />
                </router-link>
              </li>
              <li disabled>
                <router-link to='/mainchain/notaries'>
                  <span>Notaries</span>
                  <ArrowRightIcon class='ArrowRightIcon' />
                </router-link>
              </li>
              <li disabled>
                <router-link to='/mainchain/miners'>
                  <span>Miners</span>
                  <ArrowRightIcon class='ArrowRightIcon' />
                </router-link>
              </li>
              <li disabled>
                <router-link to='/mainchain/domains'>
                  <span>Domains</span>
                  <ArrowRightIcon class='ArrowRightIcon' />
                </router-link>
              </li>
              <li disabled>
                <router-link to='/mainchain/vaults'>
                  <span>Vaults</span>
                  <ArrowRightIcon class='ArrowRightIcon' />
                </router-link>
              </li>
            </ul>
            <header>Mainchain Algorithms</header>
            <div class='HORIZONTAL-LINE my-2'></div>
            <ul class='LIST'>
              <li disabled>
                <router-link to='/mainchain/proof-of-work'>
                  <span>Proof-of-Work</span>
                  <ArrowRightIcon class='ArrowRightIcon' />
                </router-link>
              </li>
              <li disabled>
                <router-link to='/mainchain/proof-of-compute'>
                  <span>Proof-of-Compute</span>
                  <ArrowRightIcon class='ArrowRightIcon' />
                </router-link>
              </li>
              <li disabled>
                <router-link to='/mainchain/proof-of-query'>
                  <span>Proof-of-Query</span>
                  <ArrowRightIcon class='ArrowRightIcon' />
                </router-link>
              </li>
            </ul>
          </div>
          <div class='ARGON w-1/3'>
            <header>Argon</header>
            <div class='HORIZONTAL-LINE my-2'></div>
            <ul class='LIST'>
              <li>
                <router-link to='/argon/overview'>
                  <span>Overview</span>
                  <ArrowRightIcon class='ArrowRightIcon' />
                </router-link>
              </li>
              <li disabled>
                <router-link to='/documentation/argon'>
                  <span>Documentation</span>
                  <ArrowRightIcon class='ArrowRightIcon' />
                </router-link>
              </li>
              <li disabled>
                <router-link to='/argon/getting-started'>
                  <span>Getting Started</span>
                  <ArrowRightIcon class='ArrowRightIcon' />
                </router-link>
              </li>
              <li disabled>
                <router-link to='/argon/settlement-fees'>
                  <span>Payment Fees</span>
                  <ArrowRightIcon class='ArrowRightIcon' />
                </router-link>
              </li>
              <li disabled>
                <router-link to='/argon/faq'>
                  <span>Frequent Questions</span>
                  <ArrowRightIcon class='ArrowRightIcon' />
                </router-link>
              </li>
            </ul>
            <header>Argon Benefits</header>
            <div class='HORIZONTAL-LINE my-2'></div>
            <ul class='LIST'>
              <li disabled>
                <router-link to='/argon/inflation-resistant'>
                  <span>Inflation Resistant</span>
                  <ArrowRightIcon class='ArrowRightIcon' />
                </router-link>
              </li>
              <li>
                <router-link to='/argon/cpi-pegged'>
                  <span>CPI-Pegged</span>
                  <ArrowRightIcon class='ArrowRightIcon' />
                </router-link>
              </li>
              <li disabled>
                <router-link to='/argon/tax-collateralized'>
                  <span>Tax-Collateralized</span>
                  <ArrowRightIcon class='ArrowRightIcon' />
                </router-link>
              </li>
              <li disabled>
                <router-link to='/argon/death-spiral-immunity'>
                  <span>Death Spiral Immunity</span>
                  <ArrowRightIcon class='ArrowRightIcon' />
                </router-link>
              </li>
            </ul>
            <header>Argon Algorithms</header>
            <div class='HORIZONTAL-LINE my-2'></div>
            <ul class='LIST'>
              <li disabled>
                <router-link to='/argon/wage-protector'>
                  <span>Wage Protector</span>
                  <ArrowRightIcon class='ArrowRightIcon' />
                </router-link>
              </li>
              <li disabled>
                <router-link to='/argon/taxation'>
                  <span>Taxation</span>
                  <ArrowRightIcon class='ArrowRightIcon' />
                </router-link>
              </li>
              <li disabled>
                <router-link to='/argon/minting'>
                  <span>Minting</span>
                  <ArrowRightIcon class='ArrowRightIcon' />
                </router-link>
              </li>
              <li disabled>
                <router-link to='/argon/cpi-scoring'>
                  <span>CPI Scoring</span>
                  <ArrowRightIcon class='ArrowRightIcon' />
                </router-link>
              </li>
            </ul>
          </div>
        </div>
        <div class='ECONOMY'>
          <header>The Economy</header>
          <div class='HORIZONTAL-LINE my-2'></div>
          <ul class='LIST'>
            <li disabled>
              <router-link to='/economy/platform-pricing'>
                <span>Platform Pricing</span>
                <ArrowRightIcon class='ArrowRightIcon' />
              </router-link>
            </li>
            <li disabled>
              <router-link to='/economy/bitcoin-stabilization'>
                <span>Bitcoin Stabilization</span>
                <ArrowRightIcon class='ArrowRightIcon' />
              </router-link>
            </li>
            <li disabled>
              <router-link to='/economy/network-pulse'>
                <span>Network Pulse</span>
                <ArrowRightIcon class='ArrowRightIcon' />
              </router-link>
            </li>
            <li disabled>
              <router-link to='/economy/global-ownership'>
                <span>Global Ownership</span>
                <ArrowRightIcon class='ArrowRightIcon' />
              </router-link>
            </li>
            <li disabled>
              <router-link to='/economy/getting-started'>
                <span>Getting Started</span>
                <ArrowRightIcon class='ArrowRightIcon' />
              </router-link>
            </li>
            <li disabled>
              <router-link to='/economy/community-connections'>
                <span>Community Connections</span>
                <ArrowRightIcon class='ArrowRightIcon' />
              </router-link>
            </li>
            <li disabled>
              <router-link to='/economy/decentralized-governance'>
                <span>Decentralized Governance</span>
                <ArrowRightIcon class='ArrowRightIcon' />
              </router-link>
            </li>
            <li disabled>
              <router-link to='/economy/developer-grants'>
                <span>Developer Grants</span>
                <ArrowRightIcon class='ArrowRightIcon' />
              </router-link>
            </li>
            <li disabled>
              <router-link to='/economy/nonprofit-foundation'>
                <span>Nonprofit Foundation</span>
                <ArrowRightIcon class='ArrowRightIcon' />
              </router-link>
            </li>
          </ul>
        </div>
      </div>
      <div class='COLUMN-RIGHT flex flex-col w-4/12 text-right'>
        <header>Latest Dispatches</header>
        <div class='HORIZONTAL-LINE REVERSE my-2'></div>
        <ul class='DISPATCHES'>
          <li>
            <router-link to='/dispatches/hello-world'>
              <header>Hello World</header>
              <em>Published January 15, 2024</em>
              <p>The internet needs a new business model. Advertising and clickbait is the dominant means of revenue
                generation… Read more</p>
            </router-link>
          </li>
          <li class='LINE'></li>
          <li>
            <router-link to='/dispatches/the-first-of-four'>
              <header>The First of Four</header>
              <em>Published January 16, 2024</em>
              <p>The internet needs a new business model. Advertising and clickbait is the dominant means of revenue
                generation… Read more</p>
            </router-link>
          </li>
        </ul>

        <header>Whitepapers</header>
        <div class='HORIZONTAL-LINE REVERSE my-2'></div>
        <ul class='WHITEPAPERS'>
          <li>
            <div>
              <header>On the Stabilization of Stablecoins</header>
              <em>Published January 16, 2024</em>
            </div>
            <inline-svg width='35px' :src='require("@/assets/menu-icons/whitepaper.svg")' />
          </li>
          <li class='LINE'></li>
          <li disabled>
            <div>
              <header>Creating a Stabler Stablecoin</header>
              <em>Published January 16, 2024</em>
            </div>
            <inline-svg width='35px' :src='require("@/assets/menu-icons/whitepaper.svg")' />
          </li>
          <li class='LINE'></li>
          <li disabled>
            <div>
              <header>Bitcoin Fission Fusion</header>
              <em>Published January 16, 2024</em>
            </div>
            <inline-svg width='35px' :src='require("@/assets/menu-icons/whitepaper.svg")' />
          </li>
          <li class='LINE'></li>
          <li disabled>
            <div>
              <header>Proof of Tax</header>
              <em>Published January 16, 2024</em>
            </div>
            <inline-svg width='35px' :src='require("@/assets/menu-icons/whitepaper.svg")' />
          </li>
        </ul>
      </div>
    </div>

    <div class='HORIZONTAL-LINE NO-FADE'></div>
    <div class='BOTTOM font-light px-5 py-2 text-gray-300 opacity-50 text-sm flex flex-row items-center w-full'>
      <div>
        An open source initiative led by
        <a href='https://github.com/calebjclark'>@calebjclark</a> and
        <a href='https://github.com/blakebyrnes'>@blakebyrnes</a>.
        All content licensed as <a href='https://creativecommons.org/licenses/by/4.0/'>Creative Commons 4.0</a>
      </div>
      <div class='hidden md:flex flex-1 flex-row whitespace-nowrap justify-end'>
        <a aria-label="Discord" href="https://discord.gg/tMAycnemHU" class="block h-[34px] w-[34px] pt-[5px] text-center rounded hover:bg-gray-900" target="_blank" title="Open Discord">
          <inline-svg :src="require('@/assets/logos/discord.svg')" height="24" class="inline-block text-white" />
        </a>
        <a aria-label="Discord" href="https://github.com/ulixee" class="block h-[34px] w-[34px] pt-[5px] text-center rounded hover:bg-gray-900" target="_blank" title="Open Github">
          <inline-svg :src="require('@/assets/logos/github.svg')" height="24" class="inline-block text-white" />
        </a>
      </div>
    </div>
  </footer>
</template>

<script lang='ts'>
import * as Vue from 'vue';
import { ChevronDoubleRightIcon } from '@heroicons/vue/24/solid';
import { ArrowRightIcon } from '@heroicons/vue/24/outline'

export default Vue.defineComponent({
  components: {
    ChevronDoubleRightIcon,
    ArrowRightIcon
  }
});
</script>

<style lang='scss'>
$lineColor: #000000;
$lineShadowColor: rgba(255, 255, 255, 0.15);
$linkColor: #CA98CF;
$bgColor: #511159;

.FOOTER {
  background: $bgColor;
  font-size: 1rem;
  box-shadow: inset 0 2px 3px rgba(0, 0, 0, 1);

  .HORIZONTAL-LINE {
    border-top: 1px solid $lineColor;
    box-shadow: 0 1px 0 $lineShadowColor;
    position: relative;
    &.REVERSE:before {
      background: linear-gradient(to left, transparent, #511159);
      right: auto;
      left: 0;
    }
    &.NO-FADE:before {
      display: none;
    }
    &:before {
      content: '';
      position: absolute;
      top: -1px;
      right: 0;
      width: 100px;
      height: 2px;
      background: linear-gradient(to right, transparent, #511159);
    }
  }

  ul li.LINE {
    border-top: 1px solid $lineColor;
    box-shadow: 0 1px 0 $lineShadowColor;
    position: relative;
    opacity: 0.75;
    padding: 0 !important;
    &:before {
      content: '';
      position: absolute;
      top: -1px;
      width: 100px;
      height: 2px;
      background: linear-gradient(to left, transparent, #511159);
      left: 0;
    }
  }

  a {
    color: $linkColor;
  }

  li[disabled] {
    pointer-events: none;
    opacity: 0.5;
  }

  header {
    font-weight: bold;
    font-size: 1.1rem;
    opacity: 0.5;
  }

  ul + header {
    @apply mt-8;
  }

  p {
    font-weight: 300;
  }
  svg.LOGO {
    opacity: 0.5;
    &:nth-child(4) {
      opacity: 1;
    }
    path {
      fill: #CA98CF !important;
    }
  }
  svg.ArrowRightIcon {
    @apply inline-block w-3 h-3 relative top-[1px] fill-ulixee-purple opacity-0 transition-all duration-500;
  }

  ul.LIST {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    flex-direction: row;
    li {
      width: 100%;
      display: flex;
      flex-direction: row;
      align-items: center;
      padding: 0.2rem 0;

      a {
        display: flex;
        flex-direction: row;
        align-items: center;
        text-decoration: none;
        color: $linkColor;
        font-weight: 300;
        padding: 0.2rem 0;
        width: 100%;
        svg.ArrowRightIcon {
          width: 1rem;
          height: 1rem;
          path {
            fill: $linkColor;
          }
        }
      }
      &:hover {
        .ArrowRightIcon {
          @apply opacity-100 translate-x-1;
        }
      }
    }
  }

  ul.DISPATCHES {
    li {
      @apply mb-0.5 pt-3 pb-5 pl-2;
      background: transparent;
      &:hover {
        background: linear-gradient(to right, #420D49, transparent);
        transition: all 0.2s ease-in-out;
      }
      a {
        text-decoration: none;
      }
      header {
        opacity: 1;
      }
    }
  }

  ul.WHITEPAPERS {
    li {
      @apply flex flex-row items-center justify-between mb-0.5 pt-3 pb-5 pl-2;
      &:hover {
        background: linear-gradient(to right, #420D49, transparent);
        transition: all 0.2s ease-in-out;
      }
      & > div {
        @apply w-full;
      }
      header {
        font-size: 1.1rem;
        opacity: 1;
      }
      em {
        opacity: 0.5;
      }
      svg {
        opacity: 0.5;
        margin-left: 15px;
        g {
          fill: white !important;
        }
      }
    }
  }

  .ECONOMY {
    header {
      @apply mt-1;
    }
    ul.LIST li {
      width: 33.333333%;
    }
  }

  .BOTTOM {
    a {
      @apply text-gray-300;
    }
    a:hover {
      @apply underline decoration-dashed decoration-gray-400 text-gray-100;
    }
  }
}
</style>

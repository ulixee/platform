<template>
  <div class='Documentation Page'>
    <div class='mt-[52px] pt-12 pb-40 mx-[7%]'>
      <div class='flex flex-row'>
        <div class='w-8/12'>
          <h1 class='font-bold text-lg text-ulixee-darker md:text-2xl xl:text-2xl tracking-[0.2em] uppercase'>
            Documentation</h1>
        </div>
        <div class='self-end w-4/12'>
          <div class='flex flex-row items-center'>
            <label for='location' class='block text-sm font-medium mr-2 mt-1 text-slate-400 whitespace-nowrap w-full text-right'>Filter By</label>
            <select @change='runFilter' id='location' class='mt-2 block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6'>
              <option value='' selected>Show All</option>
              <option value='datanet'>Datanet Tools</option>
              <option value='mainchain'>Mainchain Tools</option>
              <option value='argon'>Argon Tools</option>
            </select>
          </div>
        </div>
      </div>

      <ul class='border-t border-slate-300 mt-7 grid grid-rows-5 grid-cols-3 grid-flow-row gap-y-1 gap-x-1 pt-1 text-center'>
        <li class='DocItem First h-60' datanet>
          <div>
            <router-link to='/documentation/hero'>
              <div>
                <header>
                  <inline-svg :src="require('@/assets/tool-icons/hero.svg')" class='inline' :height='25' />
                  Hero
                </header>
                <p>Hero is a scriptable web browser for extracting structured data from websites.</p>
              </div>
              <ul class='Tags'>
                <li>Datanet</li>
              </ul>
            </router-link>
          </div>
        </li>
        <li class='DocItem' datanet mainchain>
          <div>
            <router-link to='/documentation/datastore'>
              <div>
                <header>
                  <inline-svg :src="require('@/assets/tool-icons/datastore.svg')" class='inline' :height='25' />
                  Datastores
                </header>
                <p>Datastores are permissionless "stores" to sell structured datasets, accessible via SQL or NoSQL.</p>
              </div>
              <ul class='Tags'>
                <li>Datanet</li>
                <li>Mainchain</li>
              </ul>
            </router-link>
          </div>
        </li>
        <li class='DocItem' datanet mainchain>
          <div>
            <router-link to='/documentation/cloud'>
              <div>
                <header>
                  <inline-svg :src="require('@/assets/tool-icons/cloud.svg')" class='inline' :height='25' />
                  Cloud
                </header>
                <p>Cloud is an open computing stack for running, managing, and scaling datastores.</p>
              </div>
              <ul class='Tags'>
                <li>Datanet</li>
                <li>Mainchain</li>
              </ul>
            </router-link>
          </div>
        </li>
<!--        <li class='DocItem row-span-2'>-->
<!--          <div>-->
<!--            <header>Tutorials</header>-->
<!--          </div>-->
<!--        </li>-->
<!--        <li class='DocItem'>-->
<!--          <div>-->
<!--            <router-link to='/documentation/sql'>-->
<!--              <div>-->
<!--                <header>-->
<!--                  <inline-svg :src="require('@/assets/tool-icons/usql.svg')" class='inline' :height='25' />-->
<!--                  uSQL-->
<!--                </header>-->
<!--                <p>uSQL is a subset of the Ansi SQL specification used for querying datastores.</p>-->
<!--              </div>-->
<!--              <ul class='Tags'>-->
<!--                <li>Data</li>-->
<!--              </ul>-->
<!--            </router-link>-->
<!--          </div>-->
<!--        </li>-->
        <li class='DocItem First' datanet>
          <div>
            <router-link to='/documentation/client'>
              <div>
                <header>
                  <inline-svg :src="require('@/assets/tool-icons/client.svg')" class='inline' :height='25' />
                  Client
                </header>
                <p>Client is a NodeJs library for connecting to the Ulixee Cloud and querying Datastores.</p>
              </div>
              <ul class='Tags'>
                <li>Datanet</li>
              </ul>
            </router-link>
          </div>
        </li>
<!--        <li class='DocItem'>-->
<!--          <div>-->
<!--            <router-link to='/documentation/domains'>-->
<!--              <div>-->
<!--                <header>-->
<!--                  <inline-svg :src="require('@/assets/tool-icons/domain.svg')" class='inline' :height='25' />-->
<!--                  Data Domains-->
<!--                </header>-->
<!--                <p>Data Domains are unique, easy-to-remember addresses for accessing Datastores on the Ulixee Cloud.</p>-->
<!--              </div>-->
<!--              <ul class='Tags'>-->
<!--                <li>Data</li>-->
<!--                <li>Business</li>-->
<!--              </ul>-->
<!--            </router-link>-->
<!--          </div>-->
<!--        </li>-->
        <li class='DocItem' datanet mainchain argon>
          <div>
            <router-link to='/documentation/desktop'>
              <div>
                <header>
                  <inline-svg :src="require('@/assets/tool-icons/desktop.svg')" class='inline' :height='25' />
                  Desktop
                </header>
                <p>Desktop is a developer UI tool for managing your datastores, argon payments and cloud.</p>
              </div>
              <ul class='Tags'>
                <li>Datanet</li>
                <li>Mainchain</li>
                <li>Argon</li>
              </ul>
            </router-link>
          </div>
        </li>
<!--        <li class='DocItem First'>-->
<!--          <div>-->
<!--            <router-link to='/documentation/stream'>-->
<!--              <div>-->
<!--                <header>-->
<!--                  <inline-svg :src="require('@/assets/tool-icons/stream.svg')" class='inline' :height='25' />-->
<!--                  Stream-->
<!--                </header>-->
<!--                <p>Stream is an advanced client library for piping and combining queries across multiple datastores.</p>-->
<!--              </div>-->
<!--              <ul class='Tags'>-->
<!--                <li>Data</li>-->
<!--              </ul>-->
<!--            </router-link>-->
<!--          </div>-->
<!--        </li>-->
<!--        <li class='DocItem'>-->
<!--          <div>-->
<!--            <router-link to='/documentation/wallet'>-->
<!--              <div>-->
<!--                <header>-->
<!--                  <inline-svg :src="require('@/assets/tool-icons/wallet.svg')" class='inline' :height='25' />-->
<!--                  Wallet-->
<!--                </header>-->
<!--                <p>Wallet is a highly secure but simple tool for sending and receiving P2P payments.</p>-->
<!--              </div>-->
<!--              <ul class='Tags'>-->
<!--                <li>Data</li>-->
<!--                <li>Business</li>-->
<!--                <li>Payments</li>-->
<!--              </ul>-->
<!--            </router-link>-->
<!--          </div>-->
<!--        </li>-->
<!--        <li class='DocItem'>-->
<!--          <div>-->
<!--            <router-link to='/documentation/notary'>-->
<!--              <div>-->
<!--                <header>-->
<!--                  <inline-svg :src="require('@/assets/tool-icons/notary.svg')" class='inline' :height='25' />-->
<!--                  Notaries-->
<!--                </header>-->
<!--                <p>Notaries are zero-knowledge validators that secures P2P transactions across the network.</p>-->
<!--              </div>-->
<!--              <ul class='Tags'>-->
<!--                <li>Data</li>-->
<!--                <li>Business</li>-->
<!--                <li>Payments</li>-->
<!--              </ul>-->
<!--            </router-link>-->
<!--          </div>-->
<!--        </li>-->
<!--        <li class='DocItem First'>-->
<!--          <div>-->
<!--            <router-link to='/documentation/miner'>-->
<!--              <div>-->
<!--                <header>-->
<!--                  <inline-svg :src="require('@/assets/tool-icons/miner.svg')" class='inline' :height='25' />-->
<!--                  Miners-->
<!--                </header>-->
<!--                <p>Miners are the computational nodes that connect the network and build the blocks.</p>-->
<!--              </div>-->
<!--              <ul class='Tags'>-->
<!--                <li>Data</li>-->
<!--                <li>Business</li>-->
<!--                <li>Payments</li>-->
<!--              </ul>-->
<!--            </router-link>-->
<!--          </div>-->
<!--        </li>-->
<!--        <li class='DocItem'>-->
<!--          <div>-->
<!--            <router-link to='/documentation/kademlia'>-->
<!--              <div>-->
<!--                <header>-->
<!--                  <inline-svg :src="require('@/assets/tool-icons/kademlia.svg')" class='inline' :height='25' />-->
<!--                  Kademlia-->
<!--                </header>-->
<!--                <p>Kademlia is the storage network that allows for quick access to off-chain data.</p>-->
<!--              </div>-->
<!--              <ul class='Tags'>-->
<!--                <li>Data</li>-->
<!--                <li>Business</li>-->
<!--                <li>Payments</li>-->
<!--              </ul>-->
<!--            </router-link>-->
<!--          </div>-->
<!--        </li>-->
<!--        <li class='DocItem'>-->
<!--          <div>-->
<!--            <router-link to='/documentation/cli'>-->
<!--              <div>-->
<!--                <header>-->
<!--                  <inline-svg :src="require('@/assets/tool-icons/cli.svg')" class='inline' :height='25' />-->
<!--                  CLI-->
<!--                </header>-->
<!--                <p>CLI is Ulixee's command line interface for developers and developer-minded individuals.</p>-->
<!--              </div>-->
<!--              <ul class='Tags'>-->
<!--                <li>Data</li>-->
<!--                <li>Business</li>-->
<!--                <li>Payments</li>-->
<!--              </ul>-->
<!--            </router-link>-->
<!--          </div>-->
<!--        </li>-->
<!--        <li class='DocItem First'>-->
<!--          <div>-->
<!--            <router-link to='/documentation/block'>-->
<!--              <div>-->
<!--                <header>-->
<!--                  <inline-svg :src="require('@/assets/tool-icons/block.svg')" class='inline' :height='25' />-->
<!--                  Blocks-->
<!--                </header>-->
<!--                <p>Blocks are the on-chain storage of Ulixee's Mainchain and the heartbeat that makes it all work.</p>-->
<!--              </div>-->
<!--              <ul class='Tags'>-->
<!--                <li>Data</li>-->
<!--                <li>Business</li>-->
<!--                <li>Payments</li>-->
<!--              </ul>-->
<!--            </router-link>-->
<!--          </div>-->
<!--        </li>-->
        <li class='DocItem'>
          <div></div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script lang="ts">
import * as Vue from "vue";

export default Vue.defineComponent({
  components: {},
  methods: {
    runFilter($event: any) {
      const filter = $event.target.value.toLowerCase();
      const items = document.querySelectorAll('.DocItem');
      items.forEach((item: any) => {
        const shouldShow = !filter || item.hasAttribute(filter)
        item.classList.toggle('Hidden', !shouldShow);
      });
    }
  }
});
</script>

<style lang='scss'>
.Documentation.Page {
  .DocItem {
    @apply border-b border-slate-300 pb-1;
    & > div {
      @apply h-full relative px-1 flex flex-col;
      &:before {
        @apply absolute -left-0.5 border-l border-slate-300 h-full top-0;
        content: '';
      }
    }
    &.First > div {
      @apply pl-0;
      &:before {
        @apply border-l-0;
      }
    }
    &.Hidden {
      display: none;
    }
    header {
      @apply pt-10 pb-5 font-bold;
    }
    p {
      @apply font-light text-slate-700;
    }
    ul.Tags {
      @apply mt-2;
      li {
        @apply inline-block bg-slate-300 text-white rounded-full px-2 py-1 text-xs mr-2;
      }
    }
    svg g {
      @apply fill-ulixee-purple;
    }
    a {
      @apply no-underline hover:bg-white/50 px-9 pb-4 h-full flex flex-col;
      & > div {
        @apply flex-1;
      }
    }
  }
}
</style>
<script setup lang='ts'>
</script>
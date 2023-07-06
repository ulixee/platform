<template>
  <MainLayout class="Unblocked" :showPadding="false" navBgColor="#61666A">
    <div class=" bg-[#383D43] text-gray-300 min-h-screen py-16">

    <div class="flex flex-row pl-24 items-stretch">
      <div class="w-11/12">
        <svg viewBox="0 0 88 13" class="font-extralight w-full -ml-2">
          <text x="0" y="12" style="fill: #E7C7EB">UNBLOCKED</text>
        </svg>
        <div class="w-11/12">
          <div class="FADED-LINE mt-4"></div>
          <svg viewBox="0 0 315 20" class="font-extralight w-full opacity-80">
            <text x="0" y="16" style="fill: white">THE WEB SCRAPER PROTECTION BUREAU</text>
          </svg>
          <div class="FADED-LINE !w-11/12 mt-2"></div>
        </div>
        <div class="w-10/12 pr-36">
          <p class="text-3xl mt-9 opacity-90 leading-relaxed font-light">
            It's a global problem. Corporate behemoths are <strong>trying to stop entrepreneurs</strong> from using automated
            scripts to read the web's data. These corporations are deploying tools called “bot blockers”, and their goal is to
            <strong>shut down the open web</strong>. They want to ensure new products have no chance of competing against
            their entrenched monopolies.
          </p>
          <p class="text-3xl mt-5 leading-relaxed">
            Innovators must <strong>unite together</strong> to stop these bot blockers. The web was invented with <strong>public
            tax dollars</strong> for the purpose of an open sharing platform, and these <strong>bot blockers are
            threatening to ruin it</strong>. The web must be kept open or the internet as we know it will disappear.
          </p>
        </div>
      </div>
      <div class="w-2/12 relative">
        <div class="absolute top-10 right-0 w-[200%] flex flex-col" style="height: calc(100% - 20px); ">
          <div class="relative">
            <inline-svg :src="require('@/assets/unblocked/lab.svg')" />
            <inline-svg class="absolute bottom-0 left-16 w-6/12" :src="require('@/assets/unblocked/scientist.svg')" />
          </div>
          <div class="flex flex-col flex-1 text-center">
            <div class="LAB-ROW !w-[103%] right-[3%]">
              <div class="LAB-ITEM">Keyboard Strokes</div>
              <div class="LAB-ITEM">JS Runtime</div>
            </div>
            <div class="LAB-ROW">
              <div class="LAB-ITEM">HTTP</div>
              <div class="LAB-ITEM">Codecs</div>
              <div class="LAB-ITEM">Headers</div>
            </div>
            <div class="LAB-ROW pr-[5%] !w-[105%] right-[5%]">
              <div class="LAB-ITEM">Mouse Interactions</div>
              <div class="LAB-ITEM">Cookies</div>
            </div>
            <div class="LAB-ROW">
              <div class="LAB-ITEM">WebRTC</div>
              <div class="LAB-ITEM">HTTPS</div>
              <div class="LAB-ITEM">XHR</div>
            </div>
            <div class="LAB-ROW pr-[5%] !w-[105%] right-[5%]">
              <div class="LAB-ITEM">System Fonts</div>
              <div class="LAB-ITEM">Canvas</div>
            </div>
            <div class="LAB-ROW">
              <div class="LAB-ITEM">TCP</div>
              <div class="LAB-ITEM">TLS</div>
              <div class="LAB-ITEM">WebGL</div>
            </div>
            <div class="LAB-ROW">
              <div class="LAB-ITEM">WebSockets</div>
              <div class="LAB-ITEM">SSL Certs</div>
            </div>
          </div>
        </div>
      </div>
    </div>

      <div class="px-24 border-t border-gray-500 pt-16 mt-10">
        <h2 class="text-xl">Projects We're Working On</h2>
        <div class="flex flex-row items-stretch space-x-10 border-b border-gray-500 pb-5">
          <ul class="grid grid-cols-2 gap-x-20 TOOLS">
            <li>
              <a href="https://github.com/ulixee/secret-agent">
                <inline-svg :src="require('@/assets/unblocked/logos/secret-agent.svg')" />
                <div>
                  <header>Unblocked Agent</header>
                  <p>The programatic web browser engine that's nearly impossible for bot-blockers to block.</p>
                </div>
              </a>
            </li>
            <li>
              <a href="https://github.com/ulixee/double-agent">
                <inline-svg :src="require('@/assets/unblocked/logos/double-agent.svg')" />
                <div>
                  <header>Double Agent</header>
                  <p>A suite of common bot blocking patterns to test and track browser capabilities.</p>
                </div>
              </a>
            </li>
            <li>
              <a href="https://github.com/ulixee/unblocked/tree/main/emulator-plugins">
                <inline-svg :src="require('@/assets/unblocked/logos/emulator-plugins.svg')" />
                <div>
                  <header>Unblocked Plugins</header>
                  <p>A community standard for creating emulator plugins that help scrapers evade bot-blockers.</p>
                </div>
              </a>
            </li>
            <li>
              <a href="https://github.com/ulixee/browser-vault">
                <inline-svg :src="require('@/assets/unblocked/logos/browser-vault.svg')" />
                <div>
                  <header>Browser Vault</header>
                  <p>Chrome versions that stay locked and datasets detailing the vast array of browser differences.</p>
                </div>
              </a>
            </li>
            <li>
              <a href="https://github.com/ulixee/mission-impossible">
                <inline-svg :src="require('@/assets/unblocked/logos/mission-impossible.svg')" />
                <div>
                  <header>Mission Impossible</header>
                  <p>A tool for testing the evasion capability of scraper engines across the top 10,000 websites.</p>
                </div>
              </a>
            </li>
            <li>
              <a href="https://github.com/ulixee/scraper-report">
                <inline-svg :src="require('@/assets/unblocked/logos/scraper-report.svg')" />
                <div>
                  <header>Scraper Report</header>
                  <p>A scientific analysis of web scraper detection and your probability of being blocked.</p>
                </div>
              </a>
            </li>
          </ul>
        </div>
      </div>

      <section class="w-6/12 m-auto my-32 text-center">
        <header class="font-bold text-2xl mb-1">Copy It, Fork It, Steal It Or Embed It</header>
        <p class="font-light font-xl">Unblocked Is a community-supported project. Although these tools were initially built by Ulixee, we hope they will be copied, forked, embedded and updated by scraping tools around the world. We believe the more open the web, the more innovative the world, and the better for all of us.</p>
      </section>

    </div>
  </MainLayout>
</template>

<style lang="scss" scoped>
a {
  text-decoration: none;
}

strong {
  @apply font-bold;
}

.LAB-ROW {
  @apply h-[14.2857%] flex flex-row w-full items-center py-[1%] relative;
  border-bottom: 1px solid #676767;
  &:last-child {
    border-bottom: none;
  }
}

.LAB-ITEM {
  @apply flex-1 text-gray-400 uppercase text-sm;
  border-right: 1px solid #676767;
}

.FADED-LINE {
  background: linear-gradient(to right, rgb(107, 114, 128) 80%, rgba(107, 114, 128, 0));
  height: 1px;
  @apply w-full;
}
.TOOLS {
  svg {
    width: 30px;
    display: inline-block;
    margin-right: 10px;
    position: relative;
    top: 5px;
  }
  a {
    @apply flex flex-row items-start;
  }
  li {
    @apply border-t border-gray-500 mt-5 pt-5;
  }
  header {
    @apply font-bold text-[#E29AEB];
  }
  p {
    @apply font-light;
  }

}
</style>

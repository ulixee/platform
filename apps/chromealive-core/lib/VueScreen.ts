import { URL } from 'url';
import ChromeAliveCore from '../index';
import { Session as HeroSession } from '@ulixee/hero-core';
import * as http from 'http';
import { Protocol } from '@ulixee/hero-interfaces/IDevtoolsSession';
import { IPuppetPage } from '@ulixee/hero-interfaces/IPuppetPage';
import { httpGet } from '@ulixee/commons/lib/downloadFile';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import { ISessionSummary } from '@ulixee/hero-interfaces/ICorePlugin';
import ISessionApi from '@ulixee/apps-chromealive-interfaces/apis/ISessionApi';

export default class VueScreen extends TypedEventEmitter<{ close: void }> {
  public puppetPage: Promise<IPuppetPage>;

  private readonly vuePath: string;

  private readonly pageUrl: string;
  private readonly pageHost: string;
  private readonly pagePath: string;
  private readonly pageProtocol: string;

  constructor(
    name: Parameters<ISessionApi['openScreen']>[0]['screenName'],
    readonly heroSession: HeroSession,
  ) {
    super();
    this.pageProtocol = 'http';
    this.pageHost = `${name.toLowerCase()}.ulixee`;
    this.pagePath = '/';
    this.pageUrl = `${this.pageProtocol}://${this.pageHost}${this.pagePath}`;
    // prevent dns lookup
    this.heroSession.mitmRequestSession.interceptorHandlers.push({
      urls: [`${this.pageProtocol}://${this.pageHost}/*`],
    });

    this.vuePath = {
      Input: '/screen-input.html',
      Output: '/screen-output.html',
      Reliability: '/screen-reliability.html',
    }[name];
  }

  public async open(): Promise<IPuppetPage> {
    if (!this.puppetPage) {
      const puppetPage = await this.openPuppetPage();
      await puppetPage.navigate(this.pageUrl);
    }
    return this.puppetPage;
  }

  public async close(): Promise<void> {
    if (this.puppetPage) {
      await this.puppetPage.then(x => x.close()).catch(() => null);
    }
  }

  private async openPuppetPage(): Promise<IPuppetPage> {
    this.puppetPage = this.heroSession.browserContext.newPage({
      runPageScripts: false,
      groupName: 'vue',
    });

    const page = await this.puppetPage;
    page.once('close', () => {
      this.puppetPage = null;
      this.emit('close');
    });
    for (const plugin of this.heroSession.plugins.corePlugins) {
      if (plugin.onNewPuppetPage) await plugin.onNewPuppetPage(page, this.sessionSummary());
    }

    await page.setNetworkRequestInterceptor(this.routeNetworkToVueApp.bind(this, this.pageUrl));
    return page;
  }

  private sessionSummary(): ISessionSummary {
    return {
      id: this.heroSession.id,
      options: this.heroSession.options,
    };
  }

  private async routeNetworkToVueApp(
    domain: string,
    request: Protocol.Fetch.RequestPausedEvent,
  ): Promise<Protocol.Fetch.FulfillRequestRequest | Protocol.Fetch.ContinueRequestRequest> {
    if (!request.request.url.startsWith(domain)) return;

    const url = new URL(request.request.url);
    url.host = ChromeAliveCore.vueServer.replace('http://', '');
    if (url.protocol === 'https') url.protocol = 'http';
    if (url.pathname === this.pagePath) {
      url.pathname = this.vuePath;
    }

    const res = await new Promise<http.IncomingMessage>(resolve => httpGet(url.href, resolve));
    const bodyChunks: Buffer[] = [];
    for await (const chunk of res) bodyChunks.push(chunk);

    return {
      requestId: request.requestId,
      responseHeaders: Object.entries(res.headers).map(x => ({
        name: x[0],
        value: x[1] as string,
      })),
      responseCode: res.statusCode,
      body: Buffer.concat(bodyChunks).toString('base64'),
    } as Protocol.Fetch.FulfillRequestRequest;
  }
}

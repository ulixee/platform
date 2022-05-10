import { URL } from 'url';
import ChromeAliveCore from '../index';
import { Session as HeroSession } from '@ulixee/hero-core';
import * as http from 'http';
import { Protocol } from '@unblocked-web/emulator-spec/browser/IDevtoolsSession';
import { IPage } from '@unblocked-web/emulator-spec/browser/IPage';
import { httpGet } from '@ulixee/commons/lib/downloadFile';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import { ISessionSummary } from '@ulixee/hero-interfaces/ICorePlugin';
import ISessionApi from '@ulixee/apps-chromealive-interfaces/apis/ISessionApi';
import Page from '@unblocked-web/secret-agent/lib/Page';

export default class VueScreen extends TypedEventEmitter<{ close: void }> {
  public page: Promise<Page>;

  private readonly vuePath: string;

  private readonly pageUrl: string;
  private readonly pageHost: string;
  private readonly pagePath: string;
  private readonly pageProtocol: string;

  constructor(
    name: Parameters<ISessionApi['openMode']>[0]['mode'],
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

  public async open(): Promise<IPage> {
    if (!this.page) {
      const page = await this.openPage();
      await page.navigate(this.pageUrl);
    }
    return this.page;
  }

  public async close(): Promise<void> {
    if (this.page) {
      await this.page.then(x => x.close()).catch(() => null);
    }
  }

  private async openPage(): Promise<IPage> {
    this.page = this.heroSession.browserContext.newPage({
      runPageScripts: false,
      groupName: 'vue',
    });

    const page = await this.page;
    page.once('close', () => {
      this.page = null;
      this.emit('close');
    });
    for (const plugin of this.heroSession.plugins.corePlugins) {
      if (plugin.onNewPage) await plugin.onNewPage(page);
    }

    await page.setNetworkRequestInterceptor(
      this.routeNetworkToVueApp.bind(this, this.pageUrl) as any,
    );
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

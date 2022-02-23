import { URL } from 'url';
import ChromeAliveCore from '../index';
import { Session as HeroSession } from '@ulixee/hero-core';
import * as http from 'http';
import { Protocol } from '@ulixee/hero-interfaces/IDevtoolsSession';
import { IPuppetPage } from '@ulixee/hero-interfaces/IPuppetPage';
import { httpGet } from '@ulixee/commons/lib/downloadFile';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import { ISessionSummary } from '@ulixee/hero-interfaces/ICorePlugin';

export default class VuePage extends TypedEventEmitter<{ close: void }> {
  private page: Promise<IPuppetPage>;

  private visiblePath: string;
  private vuePath: string;

  constructor(readonly heroSession: HeroSession, readonly pageUrl: string) {
    super();
    // prevent dns lookup
    this.heroSession.mitmRequestSession.interceptorHandlers.push({
      urls: [`${this.pageUrl}/*`],
    });
  }

  public async open(vuePath: string, visiblePath = '/') {
    this.vuePath = slashPrefix(vuePath);
    this.visiblePath = slashPrefix(visiblePath);
    const page = await this.openPuppetPage();
    await page.navigate(`${this.pageUrl}${visiblePath}`);
  }

  public async close(): Promise<void> {
    if (this.page) {
      await this.page.then(x => x.close()).catch(() => null);
    }
  }

  private async openPuppetPage(): Promise<IPuppetPage> {
    if (this.page) return this.page;

    this.page = this.heroSession.browserContext.newPage({ runPageScripts: false });

    const page = await this.page;
    page.once('close', () => {
      this.page = null;
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
    if (url.pathname === this.visiblePath) {
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

function slashPrefix(path: string): string {
  if (path.startsWith('/')) return path;
  return `/${path}`;
}

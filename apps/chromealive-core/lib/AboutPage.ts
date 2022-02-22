import { URL } from 'url';
import ChromeAliveCore from '../index';
import { Session as HeroSession } from '@ulixee/hero-core';
import * as http from 'http';
import { Protocol } from '@ulixee/hero-interfaces/IDevtoolsSession';
import { IPuppetPage } from '@ulixee/hero-interfaces/IPuppetPage';
import { httpGet } from '@ulixee/commons/lib/downloadFile';
import { TypedEventEmitter } from '@ulixee/commons/lib/eventUtils';
import { ISessionSummary } from '@ulixee/hero-interfaces/ICorePlugin';

export default class AboutPage extends TypedEventEmitter<{ close: void }> {
  private page: Promise<IPuppetPage>;

  private aboutPages = {
    circuits: 'about-screen.html',
  };

  constructor(readonly heroSession: HeroSession) {
    super();
  }

  public async open(aboutPage: keyof AboutPage['aboutPages']) {
    const page = await this.openPuppetPage();
    await page.navigate(`http://ulixee.about/${aboutPage}`);
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

    // prevent dns lookup
    this.heroSession.mitmRequestSession.interceptorHandlers.push({
      urls: ['http://ulixee.about/*'],
    });
    await page.setNetworkRequestInterceptor(
      this.routeNetworkToVueApp.bind(this, 'http://ulixee.about'),
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
    url.protocol = 'http';
    const mapping = this.aboutPages[url.pathname.slice(1)];
    if (mapping) {
      url.pathname = `/${mapping}`;
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

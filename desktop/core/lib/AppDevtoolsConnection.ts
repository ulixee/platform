import { Browser } from '@ulixee/unblocked-agent';
import MirrorPage from '@ulixee/hero-timetravel/lib/MirrorPage';
import Log from '@ulixee/commons/lib/Logger';
import Page from '@ulixee/unblocked-agent/lib/Page';
import IConnectionTransport from '@ulixee/unblocked-agent/interfaces/IConnectionTransport';
import EventSubscriber from '@ulixee/commons/lib/EventSubscriber';
import Resolvable from '@ulixee/commons/lib/Resolvable';
import { IBrowserContextHooks } from '@ulixee/unblocked-specification/agent/hooks/IBrowserHooks';
import WebSocket = require('ws');

const { log } = Log(module);

let counter = 0;
export default class AppDevtoolsConnection implements IConnectionTransport {
  public browser: Browser;
  public onMessageFn: (message: string) => void;
  public readonly onCloseFns: (() => void)[] = [];
  public connectedPromise = new Resolvable<void>();
  public isClosed = false;

  private id = counter++;
  private events = new EventSubscriber();

  constructor(readonly webSocket: WebSocket) {
    this.browser = new Browser(
      {
        isHeaded: true,
        launchArguments: [],
        executablePath: 'electron',
        fullVersion: '',
        name: 'ChromeAlive',
        userDataDir: '',
        doesBrowserAnimateScrolling: false,
        executablePathEnvVar: '',
        isInstalled: true,
        verifyLaunchable: () => Promise.resolve(),
      },
      this,
    );

    this.events.on(this.webSocket, 'message', this.onMessage.bind(this));
    this.events.once(this.webSocket, 'close', this.onClosed.bind(this));
    this.events.once(this.webSocket, 'error', error => {
      if (!this.connectedPromise.isResolved) this.connectedPromise.reject(error, true);
      if (this.isClosed) return;
      if (error.code !== 'EPIPE') {
        log.error('WebsocketTransport.error', { error, sessionId: null });
      }
    });
  }

  public async attachToDevtools(targetId: string): Promise<void> {
    await this.browser.connectToPage(targetId, {
      enableDomStorageTracker: false,
      runPageScripts: false,
    });
  }

  public async attachToPage(
    targetId: string,
    browserContextId: string,
    hooks: IBrowserContextHooks,
  ): Promise<Page> {
    await this.browser.connect(this);
    const page = await this.browser.connectToPage(targetId, MirrorPage.newPageOptions, hooks);
    const pageTargets = await this.browser.getAllPageTargets();
    for (const target of pageTargets) {
      if (target.url.startsWith('devtools://') && target.browserContextId === browserContextId) {
        await this.attachToDevtools(target.targetId);
      }
    }
    return page;
  }

  public send(message: string): boolean {
    if (this.webSocket.readyState === WebSocket.OPEN) {
      this.webSocket.send(message);
      return true;
    }
    return false;
  }

  public close(): void {
    this.isClosed = true;
    this.events.close();
    try {
      this.webSocket.close();
    } catch {}
  }

  private onClosed(): void {
    log.stats('WebSocketTransport.Closed');
    for (const close of this.onCloseFns) close();
  }

  private onMessage(event: string): void {
    this.onMessageFn?.(event);
  }
}

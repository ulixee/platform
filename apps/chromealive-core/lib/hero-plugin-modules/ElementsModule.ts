import { IPuppetPage } from '@ulixee/hero-interfaces/IPuppetPage';
import highlightConfig from './highlightConfig';
import HeroCorePlugin from '../HeroCorePlugin';

export default class ElementsModule {
  constructor(private heroCorePlugin: HeroCorePlugin) {}

  public async onNewPuppetPage(puppetPage: IPuppetPage): Promise<any> {
    await puppetPage.devtoolsSession.send('DOM.enable');
    await puppetPage.devtoolsSession.send('Overlay.enable');
  }

  public async highlightNode(backendNodeId: number): Promise<void> {
    await this.heroCorePlugin.activePuppetPage?.devtoolsSession.send('Overlay.highlightNode', {
      highlightConfig,
      backendNodeId,
    });
  }

  public async hideHighlight(): Promise<void> {
    await this.heroCorePlugin.activePuppetPage?.devtoolsSession.send('Overlay.hideHighlight');
  }

  public async generateQuerySelector(_backendNodeId: number): Promise<void> {
    //
  }
}

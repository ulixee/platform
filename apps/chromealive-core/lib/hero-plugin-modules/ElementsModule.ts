import { IPage } from '@unblocked-web/specifications/agent/browser/IPage';
import * as fs from 'fs';
import { ISelectorMap } from '@ulixee/apps-chromealive-interfaces/ISelectorMap';
import highlightConfig from './highlightConfig';
import HeroCorePlugin from '../HeroCorePlugin';

const installSymbol = Symbol.for('@ulixee/generateSelectorMap');
export default class ElementsModule {
  constructor(private heroCorePlugin: HeroCorePlugin) {}

  public async onNewPage(page: IPage): Promise<any> {
    await page.devtoolsSession.send('DOM.enable');
    await page.devtoolsSession.send('Overlay.enable');
  }

  public async highlightNode(id: { backendNodeId?: number; objectId?: string }): Promise<void> {
    await this.heroCorePlugin.activePage?.devtoolsSession.send('Overlay.highlightNode', {
      highlightConfig,
      ...id,
    });
  }

  public async hideHighlight(): Promise<void> {
    await this.heroCorePlugin.activePage?.devtoolsSession.send('Overlay.hideHighlight');
  }

  public async generateQuerySelector(
    id: {
      backendNodeId?: number;
      objectId?: string;
    },
  ): Promise<ISelectorMap> {
    const frame = this.heroCorePlugin.activePage.mainFrame;
    const chromeObjectId = id.objectId ?? (await frame.resolveDevtoolsNodeId(id.backendNodeId, false));
    if (!frame[installSymbol]) {
      await frame.evaluate(injectedScript, false);
      frame[installSymbol] = true;
    }
    return await frame.evaluateOnNode<ISelectorMap>(
      chromeObjectId,
      `(() => {
      const context = generateSelectorMap(this)
      return {
        target: {
          heroNodeId: context.target.heroNodeId,
          selectorOptions: context.target.selectorOptions,
        },
        ancestors: context.ancestors.map(x => ({
          heroNodeId: x.heroNodeId,
          selectorOptions: x.selectorOptions,
        })),
        topMatches: context.selectors.slice(0, 5000).map(x => x.selector),
        nodePath: context.nodePath,
      };
    })();`,
    );
  }
}

const pageScripts = {
  generateSelectorMap: fs.readFileSync(
    `${__dirname}/../../injected-scripts/generateSelectorMap.js`,
    'utf8',
  ),
};

const injectedScript = `(function generateSelectorMap() {
  const exports = {}; // workaround for ts adding an exports variable

  ${pageScripts.generateSelectorMap};
  
  window.generateSelectorMap = generateSelectorMap;
})();`;

import { IPuppetPage } from '@ulixee/hero-interfaces/IPuppetPage';
import highlightConfig from './highlightConfig';
import HeroCorePlugin from '../HeroCorePlugin';
import * as fs from 'fs';
import { ISelectorMapContext } from '../../injected-scripts/generateSelectorMap';
import { ISelectorMap } from '@ulixee/apps-chromealive-interfaces/ISelectorMap';

const installSymbol = Symbol.for('@ulixee/generateSelectorMap');
export default class ElementsModule {
  constructor(private heroCorePlugin: HeroCorePlugin) {}

  public async onNewPuppetPage(puppetPage: IPuppetPage): Promise<any> {
    await puppetPage.devtoolsSession.send('DOM.enable');
    await puppetPage.devtoolsSession.send('Overlay.enable');
  }

  public async highlightNode(id: { backendNodeId?: number; objectId?: string }): Promise<void> {
    await this.heroCorePlugin.activePuppetPage?.devtoolsSession.send('Overlay.highlightNode', {
      highlightConfig,
      ...id,
    });
  }

  public async hideHighlight(): Promise<void> {
    await this.heroCorePlugin.activePuppetPage?.devtoolsSession.send('Overlay.hideHighlight');
  }

  public async generateQuerySelector(
    id: {
      backendNodeId?: number;
      objectId?: string;
    },
    results = 50,
  ): Promise<ISelectorMap> {
    const frame = this.heroCorePlugin.activePuppetPage.mainFrame;
    const chromeObjectId = id.objectId ?? (await frame.resolveNodeId(id.backendNodeId, false));
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
        topMatches: context.selectors.slice(0, ${results ?? 50}).map(x => x.selector),
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

import { EventEmitter } from 'events';
import { CanceledPromiseError } from '@ulixee/commons/interfaces/IPendingWaitEvent';
import IDevtoolsSession from '@ulixee/hero-interfaces/IDevtoolsSession';
import BridgeToExtension from '../bridges/BridgeToExtension';
import { MessageEventType } from '../BridgeHelpers';

export default class FocusedWindowModule {
  private bridgeToExtension: BridgeToExtension;
  private bNodeIdToObjectIdMap: {
    [puppetPageId: string]: {
      [contextId: string]: {
        [backendNodeId: number]: string;
      };
    };
  } = {};

  constructor(bridgeToExtension: BridgeToExtension, browserEmitter: EventEmitter) {
    this.bridgeToExtension = bridgeToExtension;
    browserEmitter.on('payload', (payload, puppetPageId) => {
      if (payload.event === MessageEventType.ContentScriptNeedsElement) {
        this.sendElementToContentScript(payload, puppetPageId).catch(error => {
          console.log('ERROR SENDING TO ELEMENT: ', error);
        });
      }
    });
  }

  private async sendElementToContentScript({ backendNodeId, callbackFnName }, puppetPageId) {
    const remoteObjectId = await this.resolveBackendNodeId(backendNodeId, puppetPageId);
    await this.sendToContentScript(backendNodeId, remoteObjectId, callbackFnName, puppetPageId);
  }

  private async resolveBackendNodeId(
    backendNodeId: number,
    puppetPageId: string,
  ): Promise<string> {
    const contextId = this.bridgeToExtension.getContextIdByPuppetPageId(puppetPageId);
    this.bNodeIdToObjectIdMap[puppetPageId] ??= {};
    this.bNodeIdToObjectIdMap[puppetPageId][contextId] ??= {};
    const objectId = this.bNodeIdToObjectIdMap[puppetPageId][contextId][backendNodeId];
    if (objectId) return objectId;

    const devtoolsSession = this.bridgeToExtension.getDevtoolsSessionByPuppetPageId(puppetPageId);
    const result = await devtoolsSession.send('DOM.resolveNode', {
      backendNodeId,
      executionContextId: contextId,
    });
    const remoteObjectId = result.object.objectId;
    this.bNodeIdToObjectIdMap[puppetPageId][contextId][backendNodeId] = remoteObjectId;
    return remoteObjectId;
  }

  private async sendToContentScript<T>(
    backendNodeId: number,
    remoteObjectId: string,
    callbackFnName: string,
    puppetPageId: string,
  ): Promise<T> {
    try {
      const devtoolsSession = this.bridgeToExtension.getDevtoolsSessionByPuppetPageId(puppetPageId);
      const result = await devtoolsSession.send('Runtime.callFunctionOn', {
        functionDeclaration: `function executeRemoteFn() {
          window.${callbackFnName}(${backendNodeId}, this);
        }`,
        objectId: remoteObjectId,
      });
      if (result.exceptionDetails) {
        throw new Error(JSON.stringify(result.exceptionDetails));
      }
    } catch (err) {
      if (err instanceof CanceledPromiseError) return;
      throw err;
    }
  }
}

import { applyBeforeSyncSetters, callMethod } from './worker-proxy';
import { EMPTY_ARRAY } from '../utils';
import { getEnvDocument } from './worker-environment';
import type { HTMLDocument } from './worker-document';
import { insertIframe, insertScriptContent } from './worker-exec';
import { InterfaceTypeKey, NodeNameKey, webWorkerCtx, WinIdKey } from './worker-constants';
import { NodeName, WorkerMessageType } from '../types';
import { WorkerProxy } from './worker-proxy-constructor';

export class Node extends WorkerProxy {
  appendChild(node: Node) {
    return this.insertBefore(node, null);
  }

  get ownerDocument(): HTMLDocument {
    return getEnvDocument(this);
  }

  get href() {
    return;
  }
  set href(_: any) {}

  insertBefore(newNode: Node, referenceNode: Node | null) {
    const winId = newNode[WinIdKey];
    const nodeName = newNode[NodeNameKey];
    const isScript = nodeName === NodeName.Script;
    const isIFrame = nodeName === NodeName.IFrame;

    if (isScript) {
      insertScriptContent(newNode);
    }

    applyBeforeSyncSetters(newNode);

    newNode = callMethod(this, ['insertBefore'], [newNode, referenceNode], EMPTY_ARRAY);

    if (isIFrame) {
      insertIframe(newNode);
    }
    if (isScript) {
      webWorkerCtx.$postMessage$([WorkerMessageType.InitializeNextScript, winId]);
    }

    return newNode;
  }

  get nodeName() {
    return this[NodeNameKey];
  }

  get nodeType() {
    return this[InterfaceTypeKey];
  }
}

import { HTMLAnchorElement } from './worker-anchor';
import { HTMLDocument, WorkerDocumentElementChild } from './worker-document';
import { HTMLElement } from './worker-element';
import { HTMLIFrameElement, Window } from './worker-iframe';
import { HTMLScriptElement } from './worker-script';
import { InterfaceType, NodeName } from '../types';
import { Node } from './worker-node';
import { toUpper } from '../utils';
import { WorkerProxy } from './worker-proxy-constructor';

export const constructInstance = (
  interfaceType: InterfaceType,
  instanceId: number,
  winId?: number,
  nodeName?: string
) => {
  nodeName =
    interfaceType === InterfaceType.Document
      ? NodeName.Document
      : interfaceType === InterfaceType.TextNode
      ? NodeName.Text
      : interfaceType === InterfaceType.CommentNode
      ? NodeName.Comment
      : interfaceType === InterfaceType.DocumentFragmentNode
      ? NodeName.DocumentFragment
      : interfaceType === InterfaceType.DocumentTypeNode
      ? NodeName.DocumentTypeNode
      : nodeName;

  const Cstr = getConstructor(interfaceType, nodeName);
  return new Cstr(interfaceType, instanceId, winId, nodeName);
};

const getConstructor = (interfaceType: InterfaceType, nodeName?: string): typeof WorkerProxy => {
  if (interfaceType === InterfaceType.Element) {
    return getElementConstructor(nodeName!);
  } else if (interfaceType === InterfaceType.Document) {
    return HTMLDocument;
  } else if (interfaceType === InterfaceType.Window) {
    return Window;
  } else if (interfaceType <= InterfaceType.DocumentFragmentNode) {
    return Node;
  } else {
    return WorkerProxy;
  }
};

export const getElementConstructor = (nodeName: string): typeof HTMLElement =>
  elementConstructors[nodeName] || HTMLElement;

export const elementConstructors: { [tagName: string]: typeof HTMLElement } = {};

export const getTagNameFromConstructor = (t: string) => {
  t = toUpper(t.substr(4).replace('Element', ''));
  if (t === 'IMAGE') {
    return 'IMG';
  } else if (t === 'PARAGRAPH') {
    return 'P';
  } else if (t === 'TABLEROW') {
    return 'TR';
  } else if (t === 'TableCell') {
    return 'TD';
  } else {
    return t;
  }
};

export const initElementConstructors = (gblThis: any, htmlCstrName: string[]) => {
  htmlCstrName.forEach((htmlCstrName) => {
    if (!(htmlCstrName in gblThis)) {
      const HTMLCstr = Object.defineProperty(class extends HTMLElement {}, 'name', {
        value: htmlCstrName,
      });
      const tagName = getTagNameFromConstructor(htmlCstrName);
      elementConstructors[tagName] = gblThis[htmlCstrName] = HTMLCstr;
    }
  });

  gblThis.Document = HTMLDocument;
  gblThis.HTMLElement = gblThis.Element = HTMLElement;
  gblThis.Node = Node;

  elementConstructors.A = HTMLAnchorElement;
  elementConstructors.BODY = elementConstructors.HEAD = WorkerDocumentElementChild;
  elementConstructors.IFRAME = HTMLIFrameElement;
  elementConstructors.SCRIPT = HTMLScriptElement;
};

import { callMethod } from './worker-proxy';
import { constructInstance, getElementConstructor } from './worker-constructors';
import { environments, ImmediateSettersKey, WinIdKey } from './worker-constants';
import { getEnv, getEnvDocument, getEnvWindow, setEnv } from './worker-environment';
import { getPartytownScript } from './worker-exec';
import { HTMLElement } from './worker-element';
import { ImmediateSetter, InterfaceType, NodeName, PlatformInstanceId } from '../types';
import { SCRIPT_TYPE, randomId, toUpper, debug, logWorkerGetter, logWorkerSetter } from '../utils';
import { serializeForMain } from './worker-serialization';

export class HTMLDocument extends HTMLElement {
  get body() {
    return constructInstance(
      InterfaceType.Element,
      PlatformInstanceId.body,
      this[WinIdKey],
      NodeName.Body
    );
  }

  createElement(tagName: string) {
    tagName = toUpper(tagName);

    const winId = this[WinIdKey];
    const instanceId = randomId();
    const ElementCstr = getElementConstructor(tagName);
    const elm = new ElementCstr(InterfaceType.Element, instanceId, winId, tagName);
    const immediateSetter: ImmediateSetter[] = (elm[ImmediateSettersKey] = []);

    if (tagName === NodeName.IFrame) {
      immediateSetter.push([['srcdoc'], serializeForMain(winId, instanceId, getPartytownScript())]);

      // an iframe element's instanceId is the same as its contentWindow's winId
      // and the contentWindow's parentWinId is the iframe element's winId
      setEnv(instanceId, winId, environments[winId].$location$! + '');
    } else if (tagName === NodeName.Script) {
      immediateSetter.push([['type'], serializeForMain(winId, instanceId, SCRIPT_TYPE)]);
    }

    return elm;
  }

  get currentScript() {
    const currentScriptId = getEnv(this).$currentScriptId$!;
    if (currentScriptId > 0) {
      return constructInstance(
        InterfaceType.Element,
        currentScriptId,
        this[WinIdKey],
        NodeName.Script
      );
    }
    return null;
  }

  get defaultView() {
    return getEnvWindow(this);
  }

  get documentElement() {
    return constructInstance(
      InterfaceType.Element,
      PlatformInstanceId.documentElement,
      this[WinIdKey],
      NodeName.DocumentElement
    );
  }

  getElementsByTagName(tagName: string) {
    tagName = toUpper(tagName);
    if (tagName === NodeName.Body) {
      return [this.body];
    } else if (tagName === NodeName.Head) {
      return [this.head];
    } else if (tagName === NodeName.Script) {
      return [
        constructInstance(
          InterfaceType.Element,
          99, //webWorkerCtx.$firstScriptId$,
          this[WinIdKey],
          NodeName.Script
        ),
      ];
    } else {
      return callMethod(this, ['getElementsByTagName'], [tagName]);
    }
  }

  get head() {
    return constructInstance(
      InterfaceType.Element,
      PlatformInstanceId.head,
      this[WinIdKey],
      NodeName.Head
    );
  }

  get implementation() {
    return {
      hasFeature: () => true,
    };
  }

  get location() {
    if (debug) {
      logWorkerGetter(this, ['location'], getEnvWindow(this).location);
    }
    return getEnvWindow(this).location;
  }
  set location(url: any) {
    if (debug) {
      logWorkerSetter(this, ['location'], url);
    }
    getEnvWindow(this).location.href = url + '';
  }

  get parentNode() {
    return null;
  }

  get parentElement() {
    return null;
  }

  get readyState() {
    logWorkerGetter(this, ['readyState'], 'complete');
    return 'complete';
  }

  // get referrer() {
  //   logWorkerGetter(this, ['referrer'], webWorkerCtx.$documentReferrer$);
  //   return webWorkerCtx.$documentReferrer$;
  // }
}

export class WorkerDocumentElementChild extends HTMLElement {
  get parentElement() {
    return this.parentNode;
  }
  get parentNode() {
    return getEnvDocument(this).documentElement;
  }
}

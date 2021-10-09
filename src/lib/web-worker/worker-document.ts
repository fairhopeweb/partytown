import { callMethod } from './worker-proxy';
import { constructInstance, getElementConstructor } from './worker-constructors';
import { getEnv, getEnvDocument, getEnvWindow } from './worker-environment';
import { getPartytownScript } from './worker-exec';
import { HTMLElement } from './worker-element';
import { ImmediateSettersKey, WinIdKey } from './worker-constants';
import { InterfaceType, NodeName, PlatformInstanceId } from '../types';
import { SCRIPT_TYPE, randomId, toUpper, debug } from '../utils';
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

    if (tagName === NodeName.Script) {
      elm[ImmediateSettersKey] = [[['type'], serializeForMain(winId, instanceId, SCRIPT_TYPE)]];
    } else if (tagName === NodeName.IFrame) {
      elm[ImmediateSettersKey] = [
        [['srcdoc'], serializeForMain(winId, instanceId, getPartytownScript())],
      ];
    } else {
      elm[ImmediateSettersKey] = [];
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

  // get location() {
  //   logWorkerGetter(this, ['location'], webWorkerCtx.$location$);
  //   return webWorkerCtx.$location$;
  // }
  // set location(url: any) {
  //   logWorkerSetter(this, ['location'], url);
  //   webWorkerCtx.$location$!.href = url + '';
  // }

  get parentNode() {
    return null;
  }

  get parentElement() {
    return null;
  }

  // get readyState() {
  //   if (webWorkerCtx.$documentReadyState$ !== 'complete') {
  //     webWorkerCtx.$documentReadyState$ = getter(this, ['readyState']);
  //   } else {
  //     logWorkerGetter(this, ['readyState'], webWorkerCtx.$documentReadyState$);
  //   }
  //   return webWorkerCtx.$documentReadyState$;
  // }

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

let winIds = 1;

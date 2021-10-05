import { callMethod, getter, setter } from './worker-proxy';
import { constructInstance, getElementConstructor } from './worker-constructors';
import { getPartytownScript } from './worker-exec';
import { HTMLElement } from './worker-element';
import { ImmediateSettersKey, webWorkerCtx, WinIdKey } from './worker-constants';
import { InterfaceType, NodeName, PlatformInstanceId } from '../types';
import { logWorkerGetter, logWorkerSetter, SCRIPT_TYPE, randomId, toUpper } from '../utils';
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

  get compatMode() {
    return webWorkerCtx.$documentCompatMode$;
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

  get createEventObject() {
    // common check we can just avoid
    return undefined;
  }

  get currentScript() {
    if (webWorkerCtx.$currentScriptId$ > 0) {
      return constructInstance(
        InterfaceType.Element,
        webWorkerCtx.$currentScriptId$,
        this[WinIdKey],
        NodeName.Script
      );
    }
    return null;
  }

  get defaultView() {
    return self;
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
          webWorkerCtx.$firstScriptId$,
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
    logWorkerGetter(this, ['location'], webWorkerCtx.$location$);
    return webWorkerCtx.$location$;
  }
  set location(url: any) {
    logWorkerSetter(this, ['location'], url);
    webWorkerCtx.$location$!.href = url + '';
  }

  get parentNode() {
    return null;
  }

  get parentElement() {
    return null;
  }

  get readyState() {
    if (webWorkerCtx.$documentReadyState$ !== 'complete') {
      webWorkerCtx.$documentReadyState$ = getter(this, ['readyState']);
    } else {
      logWorkerGetter(this, ['readyState'], webWorkerCtx.$documentReadyState$);
    }
    return webWorkerCtx.$documentReadyState$;
  }

  get referrer() {
    logWorkerGetter(this, ['referrer'], webWorkerCtx.$documentReferrer$);
    return webWorkerCtx.$documentReferrer$;
  }
}

export class WorkerDocumentElementChild extends HTMLElement {
  get parentElement() {
    return document.documentElement;
  }
  get parentNode() {
    return document.documentElement;
  }
}

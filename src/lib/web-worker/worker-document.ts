import { callMethod } from './worker-proxy';
import { constructInstance, getElementConstructor } from './worker-constructors';
import { createEnvironment, getEnv, getEnvWindow } from './worker-environment';
import { getPartytownScript } from './worker-exec';
import { HTMLElement } from './worker-element';
import { ImmediateSetter, InterfaceType, NodeName } from '../types';
import { ImmediateSettersKey, WinIdKey } from './worker-constants';
import { SCRIPT_TYPE, randomId, toUpper, defineConstructorName } from '../utils';
import { serializeForMain } from './worker-serialization';

export class HTMLDocument extends HTMLElement {
  get body() {
    return getEnv(this).$body$;
  }

  createElement(tagName: string) {
    tagName = toUpper(tagName);

    const winId = this[WinIdKey];
    const instanceId = randomId();
    const ElementCstr = getElementConstructor(tagName);
    const elm = new ElementCstr(InterfaceType.Element, instanceId, winId, tagName);
    const immediateSetter: ImmediateSetter[] = (elm[ImmediateSettersKey] = []);

    if (tagName === NodeName.IFrame) {
      // an iframe element's instanceId is the same as its contentWindow's winId
      // and the contentWindow's parentWinId is the iframe element's winId
      createEnvironment({ $winId$: instanceId, $parentWinId$: winId, $url$: 'about:blank' });

      immediateSetter.push([['srcdoc'], serializeForMain(winId, instanceId, getPartytownScript())]);
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
    return getEnv(this).$documentElement$;
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
    return getEnv(this).$head$;
  }

  get implementation() {
    return {
      hasFeature: () => true,
    };
  }

  get location() {
    return getEnv(this).$location$;
  }
  set location(url: any) {
    getEnv(this).$location$.href = url + '';
  }

  get parentNode() {
    return null;
  }

  get parentElement() {
    return null;
  }

  get readyState() {
    return 'complete';
  }
}

export const constructDocumentElementChild = (
  winId: number,
  instanceId: number,
  titleCaseNodeName: 'Body' | 'Head'
) => {
  const HtmlCstr: typeof HTMLElement = defineConstructorName(
    class extends HTMLElement {
      get parentElement() {
        return this.parentNode;
      }
      get parentNode() {
        return getEnv(this).$documentElement$;
      }
    },
    `HTML${titleCaseNodeName}Element`
  );
  return new HtmlCstr(InterfaceType.Element, instanceId, winId, toUpper(titleCaseNodeName));
};

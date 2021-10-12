import { constructInstance } from './worker-constructors';
import { getEnv } from './worker-environment';
import { getInstanceStateValue, setInstanceStateValue } from './worker-state';
import type { HTMLDocument } from './worker-document';
import { HTMLSrcElement } from './worker-element';
import { ImmediateSettersKey, InstanceIdKey, WinIdKey } from './worker-constants';
import { InterfaceType, PlatformInstanceId, StateProp } from '../types';
import { resolveUrl, updateIframeContent } from './worker-exec';
import { serializeForMain } from './worker-serialization';
import { setter } from './worker-proxy';
import type { Window } from './worker-window';

export class HTMLIFrameElement extends HTMLSrcElement {
  get contentDocument(): HTMLDocument {
    return constructInstance(
      InterfaceType.Document,
      PlatformInstanceId.document,
      this[InstanceIdKey]
    ) as any;
  }

  get contentWindow(): Window {
    // the winId of an iframe's window is the same
    // as the instanceId of the containing iframe element
    return constructInstance(
      InterfaceType.Window,
      PlatformInstanceId.window,
      this[InstanceIdKey]
    ) as any;
  }

  get src() {
    return getInstanceStateValue(this, StateProp.url) || '';
  }
  set src(url: string) {
    let xhr = new XMLHttpRequest();
    let iframeContent: string;
    let xhrStatus: number;

    url = resolveUrl(getEnv(this), url);
    if (this.src !== url) {
      setInstanceStateValue(this, StateProp.loadErrorStatus, undefined);
      setInstanceStateValue(this, StateProp.url, url);

      xhr.open('GET', url, false);
      xhr.send();
      xhrStatus = xhr.status;

      if (xhrStatus > 199 && xhrStatus < 300) {
        iframeContent = updateIframeContent(url, xhr.responseText);
        if (this[ImmediateSettersKey]) {
          this[ImmediateSettersKey]!.push([
            ['srcdoc'],
            serializeForMain(this[WinIdKey], this[InstanceIdKey], iframeContent),
          ]);
        } else {
          setter(this, ['srcdoc'], iframeContent);
        }
      } else {
        setInstanceStateValue(this, StateProp.loadErrorStatus, xhrStatus);
      }
    }
  }
}

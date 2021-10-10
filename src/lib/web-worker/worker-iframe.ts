import { constructInstance } from './worker-constructors';
import { getEnv } from './worker-environment';
import { getInstanceStateValue, setInstanceStateValue } from './worker-state';
import { HTMLSrcElement } from './worker-element';
import { ImmediateSettersKey, InstanceIdKey, WinIdKey } from './worker-constants';
import { InterfaceType, PlatformInstanceId, StateProp } from '../types';
import { Location } from './worker-location';
import { resolveUrl, updateIframeContent } from './worker-exec';
import { serializeForMain } from './worker-serialization';
import { setter } from './worker-proxy';
import { WorkerProxy } from './worker-proxy-constructor';

export class HTMLIFrameElement extends HTMLSrcElement {
  get contentDocument() {
    return this.contentWindow!.document;
  }

  get contentWindow() {
    // the winId of an iframe's window is the same
    // as the instanceId of the containing iframe element
    const winId = this[InstanceIdKey];

    const win = new Window(InterfaceType.Window, PlatformInstanceId.window, winId);
    win.location = this.src;
    return win;
  }

  get src() {
    return getInstanceStateValue(this, StateProp.url) || '';
  }
  set src(url: string) {
    let xhr = new XMLHttpRequest();
    let iframeContent: string;

    url = resolveUrl(getEnv(this), url);
    if (this.src !== url) {
      setInstanceStateValue(this, StateProp.loadError, undefined);
      setInstanceStateValue(this, StateProp.url, url);

      xhr.open('GET', url, false);
      xhr.send();

      if (xhr.status > 199 && xhr.status < 300) {
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
        setInstanceStateValue(this, StateProp.loadError, xhr.status);
      }
    }
  }
}

export class Window extends WorkerProxy {
  get document() {
    return constructInstance(InterfaceType.Document, PlatformInstanceId.document, this[WinIdKey]);
  }

  get location(): Location {
    let location = getInstanceStateValue<Location>(this, StateProp.url);
    if (!location) {
      setInstanceStateValue(this, StateProp.url, (location = new Location('about:blank')));
    }
    return location;
  }
  set location(url: any) {
    this.location.href = !url || url === '' ? 'about:blank' : url;
  }

  get parent() {
    return constructInstance(
      InterfaceType.Window,
      PlatformInstanceId.window
      // webWorkerCtx.$parentWinId$
    );
  }

  get self() {
    return this;
  }

  get top() {
    return top;
  }

  get window() {
    return this;
  }
}

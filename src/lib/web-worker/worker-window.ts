import { constructInstance } from './worker-constructors';
import { createImageConstructor } from './worker-image';
import { debug, normalizedWinId } from '../utils';
import { environments, WinIdKey } from './worker-constants';
import { getEnv } from './worker-environment';
import type { HTMLDocument } from './worker-document';
import { InterfaceType, NodeName, PlatformInstanceId } from '../types';
import { WorkerProxy } from './worker-proxy-constructor';

export class Window extends WorkerProxy {
  get document() {
    return constructInstance(
      InterfaceType.Document,
      PlatformInstanceId.document,
      this[WinIdKey],
      NodeName.Document
    ) as HTMLDocument;
  }

  get location() {
    return getEnv(this).$location$!;
  }
  set location(loc: any) {
    const env = getEnv(this);
    env.$location$!.href = loc + '';
  }

  get globalThis() {
    return this;
  }

  get Image() {
    return createImageConstructor(this[WinIdKey]);
  }

  get name() {
    if (debug) {
      return `${name} ${normalizedWinId(this[WinIdKey])} (${this[WinIdKey]})`;
    } else {
      return name + (this[WinIdKey] as any);
    }
  }

  get parent(): Window {
    const env = getEnv(this);
    for (const winId in environments) {
      if (winId + '' == env.$parentWinId$ + '') {
        return environments[winId].$window$!;
      }
    }
    return this;
  }

  get self() {
    return this;
  }

  get top(): Window {
    for (const winId in environments) {
      if (environments[winId].$isTop$) {
        return environments[winId].$window$!;
      }
    }
    return this;
  }

  get window() {
    return this;
  }
}

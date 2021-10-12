import { createImageConstructor } from './worker-image';
import { debug, normalizedWinId } from '../utils';
import { environments, WinIdKey } from './worker-constants';
import { getEnv, getEnvWindow } from './worker-environment';
import { WorkerProxy } from './worker-proxy-constructor';

export class Window extends WorkerProxy {
  get document() {
    return getEnv(this).$document$;
  }

  get location() {
    return getEnv(this).$location$;
  }
  set location(loc: any) {
    getEnv(this).$location$.href = loc + '';
  }

  get globalThis() {
    return getEnvWindow(this);
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
    return environments[env.$parentWinId$].$window$;
  }

  get self() {
    return getEnvWindow(this);
  }

  get top(): Window {
    for (const winId in environments) {
      if (environments[winId].$isTop$) {
        return environments[winId].$window$;
      }
    }
    return getEnvWindow(this);
  }

  get window() {
    return getEnvWindow(this);
  }
}

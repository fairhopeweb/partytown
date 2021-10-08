import type { InitWebWorkerData } from '../types';
import { logWorker } from '../utils';
import { webWorkerCtx } from './worker-constants';
import { elementConstructors, getTagNameFromConstructor } from './worker-constructors';
import { HTMLElement } from './worker-element';

export const initWebWorker = (gblThis: any, initWebWorkerData: InitWebWorkerData) => {
  Object.assign(webWorkerCtx, initWebWorkerData);

  gblThis.importScripts = undefined;

  webWorkerCtx.$postMessage$ = postMessage.bind(gblThis);
  gblThis.postMessage = (msg: any, targetOrigin: string) =>
    logWorker(`postMessage(${JSON.stringify(msg)}, "${targetOrigin}"})`);

  initWebWorkerData.$htmlConstructors$.forEach((htmlCstrName) => {
    if (!(htmlCstrName in gblThis)) {
      const HTMLCstr = Object.defineProperty(class extends HTMLElement {}, 'name', {
        value: htmlCstrName,
      });

      const tagName = getTagNameFromConstructor(htmlCstrName);

      elementConstructors[tagName] = gblThis[htmlCstrName] = HTMLCstr;
    }
  });

  webWorkerCtx.$environments$ = {};
  webWorkerCtx.$isInitialized$ = true;

  logWorker(`Initialized web worker`);
};

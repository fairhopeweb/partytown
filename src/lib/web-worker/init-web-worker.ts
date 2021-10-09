import { initElementConstructors } from './worker-constructors';
import type { InitWebWorkerData } from '../types';
import { logWorker } from '../utils';
import { webWorkerCtx } from './worker-constants';

export const initWebWorker = (gblThis: any, initWebWorkerData: InitWebWorkerData) => {
  Object.assign(webWorkerCtx, initWebWorkerData);

  gblThis.importScripts = undefined;

  webWorkerCtx.$postMessage$ = postMessage.bind(gblThis);
  gblThis.postMessage = (msg: any, targetOrigin: string) =>
    logWorker(`postMessage(${JSON.stringify(msg)}, "${targetOrigin}"})`);

  initElementConstructors(gblThis, initWebWorkerData.$htmlConstructors$);

  webWorkerCtx.$environments$ = {};
  webWorkerCtx.$isInitialized$ = 1;

  logWorker(`Initialized web worker`);
};

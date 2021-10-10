import { debug, logMain, normalizedWinId } from '../utils';
import {
  InitializeEnvironmentData,
  MainWindow,
  MainWindowContext,
  PartytownWebWorker,
  PlatformInstanceId,
  WorkerMessageType,
} from '../types';
import { setInstanceId } from './main-instances';
import { winCtxs, windowIds } from './main-constants';

export const registerWindow = (
  worker: PartytownWebWorker,
  $winId$: number,
  $window$: MainWindow
) => {
  if (!windowIds.has($window$)) {
    const doc = $window$.document;
    const $url$ = doc.baseURI;

    const initEnvData: InitializeEnvironmentData = { $winId$, $url$ };

    const sendInitEnvironment = () =>
      worker.postMessage([WorkerMessageType.InitializeEnvironment, initEnvData]);

    winCtxs[$winId$] = {
      $winId$,
      $parentWinId$: windowIds.get($window$.parent)!,
      $url$,
      $window$,
    };
    if (debug) {
      winCtxs[$winId$]!.$startTime$ = performance.now();
    }

    windowIds.set($window$, $winId$);

    setInstanceId($window$, PlatformInstanceId.window);

    logMain(`Registered window ${normalizedWinId($winId$)} (${$winId$})`);

    if (doc.readyState === 'complete') {
      sendInitEnvironment();
    } else {
      $window$.addEventListener('load', sendInitEnvironment);
    }
  }
};

export const getWinCtx = (winId: number) => {
  let i = 0;
  return new Promise<MainWindowContext>((resolve) => {
    const callback = () => {
      if (winCtxs[winId] || i++ > 999) {
        resolve(winCtxs[winId]!);
      } else {
        setTimeout(callback, 9);
      }
    };
    callback();
  });
};

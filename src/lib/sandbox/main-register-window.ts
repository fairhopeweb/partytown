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

    const winCtx: MainWindowContext = {
      $winId$,
      $parentWinId$: windowIds.get($window$.parent)!,
      $url$,
      $window$,
    };
    if (debug) {
      winCtx.$startTime$ = performance.now();
    }

    windowIds.set($window$, $winId$);
    winCtxs.set($winId$, winCtx);

    setInstanceId($window$, PlatformInstanceId.window);

    logMain(`Registered window (${normalizedWinId($winId$)})`);

    if (doc.readyState === 'complete') {
      sendInitEnvironment();
    } else {
      $window$.addEventListener('load', sendInitEnvironment);
    }
  }
};

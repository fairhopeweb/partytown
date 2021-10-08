import {
  InitializeEnvironmentData,
  MainWindow,
  MainWindowContext,
  PartytownWebWorker,
  PlatformInstanceId,
  WorkerMessageType,
} from '../types';
import { debug, logMain, TOP_WIN_ID } from '../utils';
import { winCtxs, windows } from './main-constants';
import { setInstanceId } from './main-instances';
import { readNextScript } from './read-main-scripts';

let winIds = TOP_WIN_ID;

export const registerWindow = (worker: PartytownWebWorker, win: MainWindow) => {
  if (!windows.has(win)) {
    windows.add(win);

    const $winId$ = (win._ptId = winIds++);
    const $url$ = win.document.baseURI;

    const initEnvData: InitializeEnvironmentData = { $winId$, $url$ };

    const sendInit = () =>
      worker.postMessage([WorkerMessageType.InitializeEnvironment, initEnvData]);

    const doc = win.document;
    const parentWin = win.parent;
    const winCtx: MainWindowContext = {
      $winId$,
      $parentWinId$: parentWin._ptId!,
      $url$,
      $window$: win,
    };
    if (debug) {
      winCtx.$startTime$ = performance.now();
    }

    winCtxs.set(winCtx.$winId$, winCtx);

    setInstanceId(win, PlatformInstanceId.window);

    logMain(`Registered main window (${winCtx.$winId$})`);

    if (doc.readyState === 'complete') {
      sendInit();
    } else {
      win.addEventListener('load', sendInit);
    }
  }
};

import { debug, logMain, normalizedWinId, PT_INITIALIZED_EVENT, SCRIPT_TYPE } from '../utils';
import { getAndSetInstanceId } from './main-instances';
import {
  MainWindowContext,
  InitializeScriptData,
  WorkerMessageType,
  PartytownWebWorker,
} from '../types';
import { mainForwardTrigger } from './main-forward-trigger';

export const readNextScript = (worker: PartytownWebWorker, winCtx: MainWindowContext) => {
  let $winId$ = winCtx.$winId$;
  let win = winCtx.$window$;
  let doc = win.document;
  let scriptElm = doc.querySelector<HTMLScriptElement>(
    `script[type="${SCRIPT_TYPE}"]:not([data-ptid]):not([data-pterror])`
  );
  let $instanceId$: number;
  let scriptData: InitializeScriptData;

  if (scriptElm) {
    // read the next script found
    scriptElm.dataset.ptid = $instanceId$ = getAndSetInstanceId(scriptElm, $winId$) as any;

    scriptData = {
      $winId$,
      $instanceId$,
    };

    if (scriptElm.src) {
      scriptData.$url$ = scriptElm.src;
    } else {
      scriptData.$content$ = scriptElm.innerHTML;
    }

    worker.postMessage([WorkerMessageType.InitializeNextScript, scriptData]);
  } else if (!winCtx.$isInitialized$) {
    // finished environment initialization
    winCtx.$isInitialized$ = 1;

    mainForwardTrigger(worker, $winId$, win);

    doc.dispatchEvent(new CustomEvent(PT_INITIALIZED_EVENT));

    if (debug) {
      logMain(
        `Executed window ${normalizedWinId($winId$)} environment scripts in ${(
          performance.now() - winCtx.$startTime$!
        ).toFixed(1)}ms 🎉`
      );
    }

    worker.postMessage([WorkerMessageType.InitializedEnvironment, $winId$]);
  }
};

export const initializedWorkerScript = (
  worker: PartytownWebWorker,
  winCtx: MainWindowContext,
  instanceId: number,
  errorMsg: string,
  script?: HTMLScriptElement | null
) => {
  script = winCtx.$window$.document.querySelector<HTMLScriptElement>(`[data-ptid="${instanceId}"]`);

  if (script) {
    if (errorMsg) {
      script.dataset.pterror = errorMsg;
    } else {
      script.type += '-init';
    }
  }

  readNextScript(worker, winCtx);
};

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
  const $winId$ = winCtx.$winId$;
  const win = winCtx.$window$;
  const doc = win.document;
  const scriptElm = doc.querySelector<HTMLScriptElement>(
    `script[type="${SCRIPT_TYPE}"]:not([data-pt-id]):not([data-pt-error])`
  );

  if (scriptElm) {
    // read the next script found
    const $instanceId$ = getAndSetInstanceId(scriptElm, $winId$);

    const scriptData: InitializeScriptData = {
      $winId$,
      $instanceId$,
    };

    scriptElm.dataset.ptId = $instanceId$ as any;

    if (scriptElm.src) {
      scriptData.$url$ = scriptElm.src;
    } else {
      scriptData.$content$ = scriptElm.innerHTML;
    }

    worker.postMessage([WorkerMessageType.InitializeNextScript, scriptData]);
  } else if (!winCtx.$isInitialized$) {
    // finished startup
    winCtx.$isInitialized$ = 1;

    mainForwardTrigger(worker, $winId$, win);

    doc.dispatchEvent(new CustomEvent(PT_INITIALIZED_EVENT));

    if (debug) {
      logMain(
        `Executed window (${normalizedWinId($winId$)}) environment scripts in ${(
          performance.now() - winCtx.$startTime$!
        ).toFixed(1)}ms 🎉`
      );
    }
  }
};

export const initializedWorkerScript = (
  worker: PartytownWebWorker,
  winCtx: MainWindowContext,
  instanceId: number,
  errorMsg: string,
  script?: HTMLScriptElement | null
) => {
  script = winCtx.$window$.document.querySelector<HTMLScriptElement>(
    '[data-pt-id="' + instanceId + '"]'
  );

  if (script) {
    if (errorMsg) {
      script.dataset.ptError = errorMsg;
    } else {
      script.type += '-init';
    }
  }

  readNextScript(worker, winCtx);
};

import { debug, logMain, nextTick, PT_INITIALIZED_EVENT, SCRIPT_TYPE } from '../utils';
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

    scriptElm.dataset.ptId = $winId$ + '.' + $instanceId$;

    if (scriptElm.src) {
      scriptData.$url$ = scriptElm.src;
    } else {
      scriptData.$content$ = scriptElm.innerHTML;
    }

    worker.postMessage([WorkerMessageType.InitializeNextEnvironmentScript, scriptData]);
  } else if (!winCtx.$isInitialized$) {
    // finished startup
    winCtx.$isInitialized$ = true;

    if (win.frameElement) {
      win.frameElement._ptId = $winId$;
    }

    mainForwardTrigger(worker, $winId$, win);

    doc.dispatchEvent(new CustomEvent(PT_INITIALIZED_EVENT));

    if (debug) {
      logMain(
        `Executed window (${$winId$}) Partytown scripts in ${(
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
  const doc = winCtx.$window$.document;

  script = doc.querySelector<HTMLScriptElement>(
    '[data-pt-id="' + winCtx.$winId$ + '.' + instanceId + '"]'
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

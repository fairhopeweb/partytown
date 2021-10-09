import { debug, logWorker, nextTick, SCRIPT_TYPE } from '../utils';
import { environments, webWorkerCtx } from './worker-constants';
import {
  EventHandler,
  InitializeScriptData,
  WebWorkerEnvironment,
  StateProp,
  WorkerMessageType,
} from '../types';
import { getEnv } from './worker-environment';
import { getInstanceStateValue, getStateValue, setStateValue } from './worker-state';
import type { HTMLElement } from './worker-element';
import type { Node } from './worker-node';

export const initNextScriptsInWebWorker = async (initScript: InitializeScriptData) => {
  let winId = initScript.$winId$;
  let instanceId = initScript.$instanceId$;
  let scriptContent = initScript.$content$;
  let scriptSrc = initScript.$url$;
  let errorMsg = '';
  let env = environments[winId];
  let rsp: Response;

  if (scriptSrc) {
    try {
      scriptSrc = resolveUrl(env, scriptSrc);
      setStateValue(instanceId, StateProp.url, scriptSrc);

      if (debug && webWorkerCtx.$config$.logScriptExecution) {
        logWorker(`Execute script[data-pt-id="${instanceId}"], src: ${scriptSrc}`, winId);
      }

      rsp = await fetch(scriptSrc);
      if (rsp.ok) {
        scriptContent = await rsp.text();

        env.$currentScriptId$ = instanceId;
        env.$currentScriptUrl$ = scriptSrc;
        env.$run$(scriptContent);
        runStateLoadHandlers(instanceId, StateProp.loadHandlers);
      } else {
        console.error(rsp.status, 'url:', scriptSrc);
        errorMsg = rsp.statusText;
        runStateLoadHandlers(instanceId, StateProp.errorHandlers);
      }
    } catch (urlError: any) {
      console.error('url:', scriptSrc, urlError);
      errorMsg = String(urlError.stack || urlError) + '';
      runStateLoadHandlers(instanceId, StateProp.errorHandlers);
    }
  } else if (scriptContent) {
    try {
      if (debug && webWorkerCtx.$config$.logScriptExecution) {
        logWorker(`Execute script[data-pt-id="${instanceId}"]`, winId);
      }

      env.$currentScriptId$ = instanceId;
      env.$currentScriptUrl$ = '';
      env.$run$(scriptContent);
    } catch (contentError: any) {
      console.error(scriptContent, contentError);
      errorMsg = String(contentError.stack || contentError) + '';
    }
  }

  env.$currentScriptId$ = -1;
  env.$currentScriptUrl$ = '';

  webWorkerCtx.$postMessage$([
    WorkerMessageType.InitializedEnvironmentScript,
    winId,
    instanceId,
    errorMsg,
  ]);
};

const runStateLoadHandlers = (instanceId: number, type: StateProp, handlers?: EventHandler[]) => {
  handlers = getStateValue(instanceId, type);
  if (handlers) {
    nextTick(() => handlers!.map((cb) => cb({ type })));
  }
};

export const insertIframe = (iframe: Node) => {
  let loadError = getInstanceStateValue<StateProp>(iframe, StateProp.loadError);
  let handlersType = loadError ? StateProp.errorHandlers : StateProp.loadHandlers;

  let handlers = getInstanceStateValue<EventHandler[]>(iframe, handlersType);
  if (handlers) {
    handlers.map((handler) => handler({ type: StateProp.loadHandlers }));
  }
};

const resolveToUrl = (env: WebWorkerEnvironment, url?: string) =>
  new URL(url || '', env.$location$ + '');

export const resolveUrl = (env: WebWorkerEnvironment, url?: string) => resolveToUrl(env, url) + '';

export const getUrl = (elm: HTMLElement) =>
  resolveToUrl(getEnv(elm), getInstanceStateValue(elm, StateProp.href));

export const updateIframeContent = (url: string, html: string) =>
  `<base href="${url}">` +
  html
    .replace(/<script>/g, `<script type="${SCRIPT_TYPE}">`)
    .replace(/<script /g, `<script type="${SCRIPT_TYPE}" `)
    .replace(/text\/javascript/g, SCRIPT_TYPE) +
  getPartytownScript();

export const getPartytownScript = () =>
  `<script src=${JSON.stringify(webWorkerCtx.$libPath$ + 'partytown.js')} async defer></script>`;

export const sendBeacon = (env: WebWorkerEnvironment, url: string, data?: any) => {
  if (debug && webWorkerCtx.$config$.logSendBeaconRequests) {
    try {
      logWorker(
        `sendBeacon: ${resolveUrl(env, url)}${data ? ', data: ' + JSON.stringify(data) : ''}`
      );
    } catch (e) {
      console.error(e);
    }
  }
  try {
    fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      keepalive: true,
    });
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
};

import { debug, logWorker, nextTick, SCRIPT_TYPE } from '../utils';
import { environments, InstanceIdKey, webWorkerCtx } from './worker-constants';
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
        logWorker(`Execute script[data-ptid="${instanceId}"], src: ${scriptSrc}`, winId);
      }

      rsp = await fetch(scriptSrc);
      if (rsp.ok) {
        scriptContent = await rsp.text();

        env.$currentScriptId$ = instanceId;
        env.$currentScriptUrl$ = scriptSrc;
        env.$run$!(scriptContent);
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
        logWorker(
          `Execute script[data-ptid="${instanceId}"] ${scriptContent
            .split('\n')
            .map((l) => l.trim())
            .join(' ')
            .trim()
            .substr(0, 50)}...`,
          winId
        );
      }

      env.$currentScriptId$ = instanceId;
      env.$currentScriptUrl$ = '';
      env.$run$!(scriptContent);
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
  // and iframe element's instanceId is also
  // the winId of it's contentWindow
  let i = 0;
  const winId = iframe[InstanceIdKey];

  const callback = () => {
    if (environments[winId] && environments[winId].$isInitialized$) {
      let type = getInstanceStateValue<StateProp>(iframe, StateProp.loadError)
        ? StateProp.errorHandlers
        : StateProp.loadHandlers;

      let handlers = getInstanceStateValue<EventHandler[]>(iframe, type);
      if (handlers) {
        handlers.map((handler) => handler({ type }));
      }
    } else if (i++ > 2000) {
      let errorHandlers = getInstanceStateValue<EventHandler[]>(iframe, StateProp.errorHandlers);
      if (errorHandlers) {
        errorHandlers.map((handler) => handler({ type: StateProp.errorHandlers }));
      }
      console.error(`Timeout`);
    } else {
      setTimeout(callback, 9);
    }
  };

  callback();
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

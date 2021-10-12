import { debug, logWorker, nextTick, SCRIPT_TYPE, SCRIPT_TYPE_EXEC } from '../utils';
import {
  environments,
  ImmediateSettersKey,
  InstanceIdKey,
  webWorkerCtx,
  WinIdKey,
} from './worker-constants';
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
import { serializeForMain } from './worker-serialization';

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
    errorMsg = runScriptContent(env, instanceId, scriptContent, winId);
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

export const runScriptContent = (
  env: WebWorkerEnvironment,
  instanceId: number,
  scriptContent: string,
  winId: number
) => {
  let errorMsg = '';
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

  env.$currentScriptId$ = -1;
  env.$currentScriptUrl$ = '';

  return errorMsg;
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
      let type = getInstanceStateValue<StateProp>(iframe, StateProp.loadErrorStatus)
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

export const insertScriptContent = (script: Node) => {
  const scriptContent = getInstanceStateValue<string>(script, StateProp.innerHTML);

  if (scriptContent) {
    const winId = script[WinIdKey];
    const instanceId = script[InstanceIdKey];
    const immediateSetters = script[ImmediateSettersKey];
    const errorMsg = runScriptContent(getEnv(script), instanceId, scriptContent, winId);
    const datasetType = errorMsg ? 'pterror' : 'ptid';
    const datasetValue = errorMsg || instanceId;

    if (immediateSetters) {
      immediateSetters.push(
        [['type'], serializeForMain(winId, instanceId, SCRIPT_TYPE + SCRIPT_TYPE_EXEC)],
        [['dataset', datasetType], serializeForMain(winId, instanceId, datasetValue)],
        [['innerHTML'], serializeForMain(winId, instanceId, scriptContent)]
      );
    }
  }
};

const resolveToUrl = (env: WebWorkerEnvironment, url?: string) =>
  new URL(url || '', env.$location$ + '');

export const resolveUrl = (env: WebWorkerEnvironment, url?: string) => resolveToUrl(env, url) + '';

export const getUrl = (elm: HTMLElement) =>
  resolveToUrl(getEnv(elm), getInstanceStateValue(elm, StateProp.url));

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

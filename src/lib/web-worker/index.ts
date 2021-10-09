import { debug, logWorker, nextTick } from '../utils';
import { initWebWorker } from './init-web-worker';
import { InitWebWorkerData, MessageFromSandboxToWorker, WorkerMessageType } from '../types';
import { webWorkerCtx } from './worker-constants';
import { createEnvironment } from './worker-environment';
import { initNextScriptsInWebWorker } from './worker-exec';
import { callWorkerRefHandler } from './worker-serialization';

const queuedEvents: MessageEvent<MessageFromSandboxToWorker>[] = [];

const receiveMessageFromSandboxToWorker = (ev: MessageEvent<MessageFromSandboxToWorker>) => {
  const msg = ev.data;
  const msgType = msg[0];

  if (webWorkerCtx.$isInitialized$) {
    if (msgType === WorkerMessageType.InitializeNextScript) {
      // message from main to web worker that it should initialize the next script
      initNextScriptsInWebWorker(msg[1]);
    } else if (msgType === WorkerMessageType.RefHandlerCallback) {
      // main has called a worker ref handler
      callWorkerRefHandler(msg[1]);
    } else if (msgType === WorkerMessageType.ForwardWorkerAccessRequest) {
      // message forwarded from another window, like the main window accessing data from an iframe
      console.error('workerAccessHandler');
      // workerAccessHandler(msgData1 as MainAccessRequest);
    } else if (msgType === WorkerMessageType.ForwardMainTrigger) {
      console.error('workerForwardedTriggerHandle');
      // workerForwardedTriggerHandle(msgData1 as ForwardMainTriggerData);
    } else if (msgType === WorkerMessageType.RunStateHandlers) {
      console.error('RunStateHandlers');
      // runStateHandlers(msgData1 as number, msgData2 as any);
    } else if (msgType === WorkerMessageType.InitializeEnvironment) {
      createEnvironment(self, msg[1]);
    }
  } else if (msgType === WorkerMessageType.MainDataResponseToWorker) {
    // initialize the web worker with the received the main data
    initWebWorker(self as any, msg[1] as InitWebWorkerData);
    webWorkerCtx.$postMessage$([WorkerMessageType.InitializedWebWorker]);

    nextTick(() => {
      if (debug && queuedEvents.length) {
        logWorker(`Queued ready messages: ${queuedEvents.length}`);
      }
      queuedEvents.slice().forEach(receiveMessageFromSandboxToWorker);
      queuedEvents.length = 0;
    });
  } else {
    queuedEvents.push(ev);
  }
};

self.onmessage = receiveMessageFromSandboxToWorker;

postMessage([WorkerMessageType.MainDataRequestFromWorker]);

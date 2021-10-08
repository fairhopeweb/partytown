import { debug, logMain } from '../utils';
import { mainAccessHandler } from './main-access-handler';
import type {
  MainWindow,
  MessageFromWorkerToSandbox,
  MessengerRequestCallback,
  PartytownWebWorker,
} from '../types';
import { onMessageFromWebWorker } from './on-messenge-from-worker';
import syncCreateMessenger from '@sync-create-messenger';
import WebWorkerBlob from '@web-worker-blob';
import WebWorkerUrl from '@web-worker-url';
import { winCtxs } from './main-constants';

export const initSandbox = async (sandboxWindow: any) => {
  let worker: PartytownWebWorker;

  const mainWindow: MainWindow = sandboxWindow.parent;

  const receiveMessage: MessengerRequestCallback = (accessReq, responseCallback) => {
    const accessWinId = accessReq.$winId$;
    const winCtx = winCtxs.get(accessWinId)!;
    mainAccessHandler(worker, winCtx, accessReq).then(responseCallback);
  };

  const success = await syncCreateMessenger(sandboxWindow, receiveMessage);

  if (success) {
    worker = new Worker(
      debug
        ? WebWorkerUrl
        : URL.createObjectURL(
            new Blob([WebWorkerBlob], {
              type: 'text/javascript',
            })
          ),
      { name: `Partytown 🎉` }
    );

    worker.onmessage = (ev: MessageEvent<MessageFromWorkerToSandbox>) =>
      onMessageFromWebWorker(worker, mainWindow, ev.data);

    if (debug) {
      logMain(`Created web worker`);
      worker.onerror = (ev) => console.error(`Web Worker Error`, ev);
    }
  }
};

import { forwardMsgResolves, winCtxs } from './main-constants';
import {
  MainAccessResponse,
  MainWindow,
  MessageFromWorkerToSandbox,
  PartytownWebWorker,
  WorkerMessageType,
} from '../types';
import { initializedWorkerScript, readNextScript } from './read-main-scripts';
import { readMainInterfaces } from './read-main-interfaces';
import { registerWindow } from './main-register-window';

export const onMessageFromWebWorker = (
  worker: PartytownWebWorker,
  mainWindow: MainWindow,
  msg: MessageFromWorkerToSandbox
) => {
  const msgType = msg[0];

  if (msgType === WorkerMessageType.MainDataRequestFromWorker) {
    // web worker has requested data from the main thread
    // collect up all the info about the main thread interfaces
    const initWebWorkerData = readMainInterfaces(mainWindow);

    // send the main thread interface data to the web worker
    worker.postMessage([WorkerMessageType.MainDataResponseToWorker, initWebWorkerData]);
  } else if (msgType === WorkerMessageType.InitializedWebWorker) {
    // web worker has finished initializing and ready to run scripts
    registerWindow(worker, mainWindow);
  } else {
    const $winId$ = msg[1];
    const winCtx = winCtxs.get($winId$)!;

    if (msgType === WorkerMessageType.InitializeNextEnvironmentScript) {
      // web worker has been initialized with the main data
      readNextScript(worker, winCtx);
    } else if (msgType === WorkerMessageType.InitializedEnvironmentScript) {
      // web worker has finished initializing the script, and has another one to do
      // doing this postMessage back-and-forth so we don't have long running tasks
      initializedWorkerScript(worker, winCtx, msg[2] as number, msg[3] as string);
    } else if (msgType === WorkerMessageType.ForwardWorkerAccessResponse) {
      const accessRsp = msg[2] as MainAccessResponse;

      const forwardMsgResolveData = forwardMsgResolves.get(accessRsp.$msgId$);
      if (forwardMsgResolveData) {
        clearTimeout(forwardMsgResolveData[1]);
        forwardMsgResolves.delete(accessRsp.$msgId$);

        forwardMsgResolveData[0](accessRsp);
        readNextScript(worker, winCtx);
      }
    }
    // else if (msgType === WorkerMessageType.RunStateHandlers) {
    //   // run this state prop on all web workers (only one of them actually has it)
    //   // this is used for script onload, when the function was created in another window
    //   winCtxs.forEach((winCtx) => mainCtx.$worker$!.postMessage(msg));
    // }
  }
};

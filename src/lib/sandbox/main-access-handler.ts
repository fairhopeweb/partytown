import {
  AccessType,
  MainAccessRequest,
  MainAccessResponse,
  MainWindowContext,
  PartytownWebWorker,
} from '../types';
import { deserializeFromWorker, serializeForWorker } from './main-serialization';
import { EMPTY_ARRAY, isPromise, len, logMain, normalizedWinId } from '../utils';
import { getInstance, setInstanceId } from './main-instances';
import { winCtxs } from './main-constants';

export const mainAccessHandler = async (
  worker: PartytownWebWorker,
  accessReq: MainAccessRequest
) => {
  let $winId$ = accessReq.$winId$;
  let accessRsp: MainAccessResponse = {
    $msgId$: accessReq.$msgId$,
    $winId$,
  };
  let instanceId = accessReq.$instanceId$;
  let accessType = accessReq.$accessType$;
  let memberPath = accessReq.$memberPath$;
  let memberPathLength = len(memberPath);
  let lastMemberName = memberPath[memberPathLength - 1];
  let immediateSetters = accessReq.$immediateSetters$ || EMPTY_ARRAY;
  let winCtx: MainWindowContext;
  let instance: any;
  let rtnValue: any;
  let data: any;
  let i: number;
  let immediateSetterTarget: any;
  let immediateSetterMemberPath;
  let immediateSetterMemberNameLen;
  let waitTmr: any;

  // if (!winCtxs[$winId$]) {
  //   logMain(`Waiting on registering window (${normalizedWinId($winId$)})`);

  //   await new Promise<void>((resolve) => {
  //     i = 0;
  //     waitTmr = setInterval(() => {
  //       if (i++ > 999) {
  //         accessRsp.$error$ = `Timeout`;
  //         clearInterval(waitTmr);
  //         resolve();
  //       }
  //       if (winCtxs[$winId$] && winCtxs[$winId$]!.$isInitialized$) {
  //         clearInterval(waitTmr);
  //         resolve();
  //       }
  //     }, 9);
  //   });

  //   if (accessRsp.$error$) {
  //     return accessRsp;
  //   }
  // }

  winCtx = winCtxs[$winId$]!;

  try {
    // deserialize the data, such as a getter value or function arguments
    data = deserializeFromWorker(worker, accessReq.$data$);

    if (accessType === AccessType.GlobalConstructor) {
      // create a new instance of a global constructor
      setInstanceId(new (winCtx!.$window$ as any)[lastMemberName](...data), instanceId);
    } else {
      // get the existing instance
      instance = getInstance(accessRsp.$winId$, instanceId);
      if (instance) {
        for (i = 0; i < memberPathLength - 1; i++) {
          instance = instance[memberPath[i]];
        }

        if (accessType === AccessType.Get) {
          rtnValue = instance[lastMemberName];
        } else if (accessType === AccessType.Set) {
          instance[lastMemberName] = data;
        } else if (accessType === AccessType.CallMethod) {
          rtnValue = instance[lastMemberName].apply(instance, data);

          immediateSetters.map((immediateSetter) => {
            immediateSetterTarget = rtnValue;
            immediateSetterMemberPath = immediateSetter[0];
            immediateSetterMemberNameLen = len(immediateSetterMemberPath);

            for (i = 0; i < immediateSetterMemberNameLen - 1; i++) {
              immediateSetterTarget = immediateSetterTarget[immediateSetterMemberPath[i]];
            }

            immediateSetterTarget[immediateSetterMemberPath[immediateSetterMemberNameLen - 1]] =
              deserializeFromWorker(worker, immediateSetter[1]);
          });

          if (accessReq.$newInstanceId$) {
            setInstanceId(rtnValue, accessReq.$newInstanceId$);
          }
        }

        if (isPromise(rtnValue)) {
          rtnValue = await rtnValue;
          accessRsp.$isPromise$ = true;
        }
        accessRsp.$rtnValue$ = serializeForWorker($winId$, rtnValue);
      } else {
        accessRsp.$error$ = `${instanceId} not found`;
      }
    }
  } catch (e: any) {
    accessRsp.$error$ = String(e.stack || e);
  }

  return accessRsp;
};

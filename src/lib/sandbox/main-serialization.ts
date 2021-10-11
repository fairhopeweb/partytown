import { getConstructorName, isValidMemberName } from '../utils';
import { getInstance, getAndSetInstanceId } from './main-instances';
import {
  InterfaceType,
  PartytownWebWorker,
  PlatformInstanceId,
  RefHandlerCallbackData,
  SerializedInstance,
  SerializedRefTransferData,
  SerializedTransfer,
  SerializedType,
  WorkerMessageType,
} from '../types';
import { mainRefs, winCtxs } from './main-constants';

export const serializeForWorker = (
  $winId$: number,
  value: any,
  added?: Set<any>,
  type?: string,
  obj?: { [key: string]: SerializedTransfer | undefined },
  key?: string
): SerializedTransfer | undefined => {
  if (value !== undefined) {
    type = typeof value;

    if (type === 'string' || type === 'number' || type === 'boolean' || value == null) {
      return [SerializedType.Primitive, value];
    }

    if (type === 'function') {
      return [SerializedType.Function];
    }

    added = added || new Set();
    if (Array.isArray(value)) {
      if (!added.has(value)) {
        added.add(value);
        return [SerializedType.Array, value.map((v) => serializeForWorker($winId$, v, added))];
      }
      return [SerializedType.Array, []];
    }

    if (type === 'object') {
      if (value.nodeType) {
        const nodeInstance: SerializedInstance = {
          $winId$,
          $interfaceType$: value.nodeType,
          $instanceId$: getAndSetInstanceId(winCtxs[$winId$]!, value),
          $nodeName$: value.nodeName,
        };
        return [SerializedType.Instance, nodeInstance];
      }

      if (value === value.window) {
        const winInstance: SerializedInstance = {
          $winId$,
          $interfaceType$: InterfaceType.Window,
          $instanceId$: PlatformInstanceId.window,
        };
        return [SerializedType.Instance, winInstance];
      }

      if (isNodeList(getConstructorName(value))) {
        const nodeList: SerializedInstance = {
          $winId$,
          $interfaceType$: InterfaceType.NodeList,
          $items$: Array.from(value).map((v) => serializeForWorker($winId$, v, added)![1]) as any,
        };
        return [SerializedType.Instance, nodeList];
      }

      obj = {};
      if (!added.has(value)) {
        added.add(value);
        for (key in value) {
          if (isValidMemberName(key)) {
            obj[key] = serializeForWorker($winId$, value[key], added);
          }
        }
      }
      return [SerializedType.Object, obj];
    }
  }
};

export const deserializeFromWorker = (
  worker: PartytownWebWorker,
  serializedTransfer: SerializedTransfer | undefined,
  serializedType?: SerializedType,
  serializedValue?: any,
  obj?: { [key: string]: any },
  key?: string
): any => {
  if (serializedTransfer) {
    serializedType = serializedTransfer[0];
    serializedValue = serializedTransfer[1] as any;

    if (serializedType === SerializedType.Primitive) {
      return serializedValue;
    }

    if (serializedType === SerializedType.Ref) {
      return deserializeRefFromWorker(worker, serializedValue);
    }

    if (serializedType === SerializedType.Array) {
      return (serializedValue as SerializedTransfer[]).map((v) => deserializeFromWorker(worker, v));
    }

    if (serializedType === SerializedType.Instance) {
      const serializedInstance: SerializedInstance = serializedValue;
      return getInstance(serializedInstance.$winId$, serializedInstance.$instanceId$!);
    }

    if (serializedType === SerializedType.Object) {
      obj = {};
      for (key in serializedValue) {
        obj[key] = deserializeFromWorker(worker, serializedValue[key]);
      }
      return obj;
    }
  }
};

const isNodeList = (cstrName: string) => cstrName === 'HTMLCollection' || cstrName === 'NodeList';

const deserializeRefFromWorker = (
  worker: PartytownWebWorker,
  { $winId$, $instanceId$, $refId$ }: SerializedRefTransferData
) => {
  let ref = mainRefs.get($refId$);

  if (!ref) {
    ref = function (this: any, ...args: any[]) {
      const refHandlerData: RefHandlerCallbackData = {
        $winId$,
        $instanceId$,
        $refId$,
        $thisArg$: serializeForWorker($winId$, this),
        $args$: serializeForWorker($winId$, args),
      };
      worker.postMessage([WorkerMessageType.RefHandlerCallback, refHandlerData]);
    };
    mainRefs.set($refId$, ref);
  }

  return ref;
};

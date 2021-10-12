import {
  AccessType,
  ImmediateSetter,
  InterfaceType,
  MainAccessRequest,
  MainAccessResponse,
  PlatformInstanceId,
  SerializedTransfer,
} from '../types';
import {
  len,
  logWorkerCall,
  logWorkerGlobalConstructor,
  logWorkerGetter,
  logWorkerSetter,
  randomId,
  defineConstructorName,
} from '../utils';
import { deserializeFromMain, serializeForMain } from './worker-serialization';
import { getEnv } from './worker-environment';
import { getInstanceStateValue, setInstanceStateValue, setStateValue } from './worker-state';
import {
  ImmediateSettersKey,
  InstanceIdKey,
  InterfaceTypeKey,
  NodeNameKey,
  ProxyKey,
  TargetSetterKey,
  webWorkerCtx,
  WinIdKey,
} from './worker-constants';
import syncSendMessage from '@sync-send-message-to-main';
import { WorkerProxy } from './worker-proxy-constructor';

const syncMessage = (
  instance: WorkerProxy,
  $accessType$: AccessType,
  $memberPath$: string[],
  $data$?: SerializedTransfer | undefined,
  $immediateSetters$?: ImmediateSetter[],
  $newInstanceId$?: number
) => {
  const $winId$ = instance[WinIdKey];
  const $instanceId$ = instance[InstanceIdKey];

  const accessReq: MainAccessRequest = {
    $msgId$: randomId(),
    $winId$,
    $instanceId$: instance[InstanceIdKey],
    $interfaceType$: instance[InterfaceTypeKey],
    $nodeName$: instance[NodeNameKey],
    $accessType$,
    $memberPath$,
    $data$,
    $immediateSetters$,
    $newInstanceId$,
  };

  const accessRsp: MainAccessResponse = syncSendMessage(webWorkerCtx, accessReq);

  const isPromise = accessRsp.$isPromise$;
  const rtnValue = deserializeFromMain($winId$, $instanceId$, $memberPath$, accessRsp.$rtnValue$!);

  if (accessRsp.$error$) {
    if (isPromise) {
      return Promise.reject(accessRsp.$error$);
    }
    throw new Error(accessRsp.$error$);
  }

  if (isPromise) {
    return Promise.resolve(rtnValue);
  }
  return rtnValue;
};

export const getter = (instance: WorkerProxy, memberPath: string[]) => {
  if (webWorkerOnlyAccess(instance, memberPath)) {
    const wwRtnValue = getInstanceStateValue(instance, memberPath[0]);
    logWorkerGetter(instance, memberPath, wwRtnValue, true);
    return wwRtnValue;
  }

  applyBeforeSyncSetters(instance);

  const rtnValue = syncMessage(instance, AccessType.Get, memberPath);
  logWorkerGetter(instance, memberPath, rtnValue);
  return rtnValue;
};

export const setter = (instance: WorkerProxy, memberPath: string[], value: any) => {
  if (webWorkerOnlyAccess(instance, memberPath)) {
    logWorkerSetter(instance, memberPath, value, true);
    setInstanceStateValue(instance, memberPath[0], value);
  } else {
    const winId = instance[WinIdKey];
    const instanceId = instance[InstanceIdKey];
    const immediateSetters = instance[ImmediateSettersKey];
    const serializedValue = serializeForMain(winId, instanceId, value);

    logWorkerSetter(instance, memberPath, value);

    if (immediateSetters) {
      // queue up setters to be applied immediately after the
      // node is added to the dom
      immediateSetters.push([memberPath, serializedValue]);
    } else {
      syncMessage(instance, AccessType.Set, memberPath, serializedValue);
    }
  }
};

const webWorkerOnlyAccess = (instance: WorkerProxy, memberPath: string[]) => {
  if (instance[InstanceIdKey] === PlatformInstanceId.window) {
    const windowInterface = webWorkerCtx.$interfaces$[0];
    const windowMembers = windowInterface[2];
    const isWindowMember = memberPath[0] in windowMembers;
    return !isWindowMember;
  }
};

export const callMethod = (
  instance: WorkerProxy,
  memberPath: string[],
  args: any[],
  immediateSetters?: ImmediateSetter[],
  newInstanceId?: number
) => {
  applyBeforeSyncSetters(instance);
  args.map(applyBeforeSyncSetters);

  const rtnValue = syncMessage(
    instance,
    AccessType.CallMethod,
    memberPath,
    serializeForMain(instance[WinIdKey], instance[InstanceIdKey], args),
    immediateSetters,
    newInstanceId
  );
  logWorkerCall(instance, memberPath, args, rtnValue);
  return rtnValue;
};

export const createGlobalConstructorProxy = (
  winId: number,
  interfaceType: InterfaceType,
  cstrName: string
) => {
  const GlobalCstr = class {
    constructor(...args: any[]) {
      const instanceId = randomId();
      const workerProxy = new WorkerProxy(interfaceType, instanceId, winId);

      args.map(applyBeforeSyncSetters);

      syncMessage(
        workerProxy,
        AccessType.GlobalConstructor,
        [cstrName],
        serializeForMain(winId, instanceId, args)
      );

      logWorkerGlobalConstructor(winId, cstrName, args);

      return workerProxy;
    }
  };

  return defineConstructorName(GlobalCstr, cstrName);
};

export const applyBeforeSyncSetters = (instance: WorkerProxy) => {
  if (instance) {
    const beforeSyncValues = instance[ImmediateSettersKey];
    if (beforeSyncValues) {
      instance[ImmediateSettersKey] = undefined;

      callMethod(
        getEnv(instance).$document$,
        ['createElement'],
        [instance[NodeNameKey]],
        beforeSyncValues,
        instance[InstanceIdKey]
      );
    }
  }
};

const createComplexMember = (
  interfaceType: InterfaceType,
  instance: WorkerProxy,
  memberPath: string[]
) => {
  if (
    interfaceType === InterfaceType.CommentNode ||
    interfaceType === InterfaceType.DocumentTypeNode
  ) {
    // have these nodes interfaces just use the same as a text node
    interfaceType = InterfaceType.TextNode;
  }

  const interfaceInfo = webWorkerCtx.$interfaces$.find((i) => i[0] === interfaceType);
  if (interfaceInfo) {
    const memberTypeInfo = interfaceInfo[2];
    const memberInfo = memberTypeInfo[memberPath[len(memberPath) - 1]];
    if (memberInfo === InterfaceType.Function) {
      return (...args: any[]) => callMethod(instance, memberPath, args);
    } else if (memberInfo > InterfaceType.Window) {
      return proxy(memberInfo, instance, [...memberPath]);
    }
  }

  const stateValue = getInstanceStateValue<Function>(instance, memberPath[0]);
  if (typeof stateValue === 'function') {
    return (...args: any[]) => {
      const rtnValue = stateValue.apply(instance, args);
      logWorkerCall(instance, memberPath, args, rtnValue);
      return rtnValue;
    };
  }
};

export const proxy = <T = any>(
  interfaceType: InterfaceType,
  target: T,
  initMemberPath: string[]
): T => {
  if (
    !target ||
    (typeof target !== 'object' && typeof target !== 'function') ||
    (target as any)[ProxyKey] ||
    String(target).includes('[native')
  ) {
    return target;
  }

  return new Proxy<any>(target, {
    get(target, propKey) {
      if (propKey === ProxyKey) {
        return true;
      }

      if (Reflect.has(target, propKey)) {
        return Reflect.get(target, propKey);
      }

      if (Reflect.has(self, propKey)) {
        return Reflect.get(self, propKey);
      }

      const memberPath = [...initMemberPath, String(propKey)];
      const complexProp = createComplexMember(interfaceType, target, memberPath);
      if (complexProp) {
        return complexProp;
      }

      return getter(target, memberPath);
    },

    set(target, propKey, value, receiver) {
      if (Reflect.has(target, propKey) || target[TargetSetterKey]) {
        Reflect.set(target, propKey, value, receiver);
      } else {
        setter(target, [...initMemberPath, String(propKey)], value);
      }
      return true;
    },
  });
};

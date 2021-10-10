import { ImmediateSetter, InterfaceType, TargetSetterType } from '../types';
import {
  ImmediateSettersKey,
  InstanceIdKey,
  InterfaceTypeKey,
  NodeNameKey,
  TargetSetterKey,
  WinIdKey,
} from './worker-constants';
import { proxy } from './worker-proxy';

export class WorkerProxy {
  [WinIdKey]: number;
  [InstanceIdKey]: number;
  [InterfaceTypeKey]: number;
  [NodeNameKey]: string | undefined;
  [ImmediateSettersKey]: ImmediateSetter[] | undefined;
  [TargetSetterKey]: TargetSetterType;

  constructor(interfaceType: InterfaceType, instanceId: number, winId?: number, nodeName?: string) {
    this[WinIdKey] = winId!;
    this[InstanceIdKey] = instanceId!;
    this[NodeNameKey] = nodeName;
    this[ImmediateSettersKey] = undefined;
    this[TargetSetterKey] = TargetSetterType.SetToMainProxy;

    return proxy((this[InterfaceTypeKey] = interfaceType), this, []);
  }
}

import type { InterfaceType } from '../types';
import { InstanceIdKey, InterfaceTypeKey, WinIdKey } from './worker-constants';
import { WorkerProxy } from './worker-proxy-constructor';

export class Window extends WorkerProxy {
  // [WinIdKey]: number;
  // [InstanceIdKey]: number;
  // [InterfaceTypeKey]: InterfaceType.Window;
  // constructor(gblThis: any, winId: number) {
  //   this[WinIdKey] = winId;
  //   this[InstanceIdKey] = PlatformInstanceId.window;
  //   return new Proxy(this, {
  //     get(target: any, propName) {
  //       if (propName in target) {
  //         return target[propName];
  //       } else {
  //         return gblThis[propName];
  //       }
  //     },
  //     set(target: any, propName, value) {
  //       target[propName] = value;
  //       return true;
  //     },
  //   });
  // }
}

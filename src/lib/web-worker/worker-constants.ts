import type { RefHandler, StateMap, WebWorkerContext } from '../types';

export const WinIdKey = Symbol();
export const InstanceIdKey = Symbol();
export const InterfaceTypeKey = Symbol();
export const NodeNameKey = Symbol();
export const ProxyKey = Symbol();
export const ImmediateSettersKey = Symbol();

export const webWorkerRefsByRefId = new Map<number, RefHandler>();
export const webWorkerRefIdsByRef = new WeakMap<RefHandler, number>();

export const webWorkerState: StateMap = {};
export const webWorkerCtx: WebWorkerContext = {} as any;

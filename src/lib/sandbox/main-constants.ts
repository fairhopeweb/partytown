import type { MainAccessResponse, MainWindow, MainWindowContext, WinId } from '../types';

export const forwardMsgResolves = new Map<number, [(accessRsp: MainAccessResponse) => void, any]>();
export const mainInstanceIdByInstance = new WeakMap<any, number>();
export const mainInstances: [number, any][] = [];
export const winCtxs = new Map<WinId, MainWindowContext>();
export const windows = new WeakSet<MainWindow>();
export const mainRefs = new Map<number, Function>();

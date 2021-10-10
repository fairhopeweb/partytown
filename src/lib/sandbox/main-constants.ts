import type { MainWindow, MainWindowContext, WinId } from '../types';

export const mainInstanceIdByInstance = new WeakMap<any, number>();
export const mainInstances: [number, any][] = [];
export const winCtxs: { [winId: WinId]: MainWindowContext | undefined } = {};
export const windowIds = new WeakMap<MainWindow, number>();
export const mainRefs = new Map<number, Function>();

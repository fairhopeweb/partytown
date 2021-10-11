import type { Location } from './web-worker/worker-location';
import type { Window as WorkerWindow } from './web-worker/worker-window';

export type CreateWorker = (workerName: string) => Worker;

export type Messenger = (
  sandboxWindow: Window,
  receiveMessage: MessengerRequestCallback
) => Promise<boolean>;

export type MessengerRequestCallback = (
  accessReq: MainAccessRequest,
  responseCallback: MessengerResponseCallback
) => void;

export type MessengerResponseCallback = (accessRsp: MainAccessResponse) => void;

export type WinId = number;

export type MessageFromWorkerToSandbox =
  | [WorkerMessageType.MainDataRequestFromWorker]
  | [WorkerMessageType.InitializedWebWorker]
  | [WorkerMessageType.InitializedEnvironmentScript, WinId, number, string]
  | [WorkerMessageType.InitializeNextScript, WinId]
  | [WorkerMessageType.RunStateHandlers, WinId, number, StateProp];

export type MessageFromSandboxToWorker =
  | [WorkerMessageType.MainDataResponseToWorker, InitWebWorkerData]
  | [WorkerMessageType.InitializeEnvironment, InitializeEnvironmentData]
  | [WorkerMessageType.InitializedEnvironment, WinId]
  | [WorkerMessageType.InitializeNextScript, InitializeScriptData]
  | [WorkerMessageType.RefHandlerCallback, RefHandlerCallbackData]
  | [WorkerMessageType.ForwardMainTrigger, ForwardMainTriggerData]
  | [WorkerMessageType.RunStateHandlers, WinId, number, StateProp];

export const enum WorkerMessageType {
  MainDataRequestFromWorker,
  MainDataResponseToWorker,
  InitializedWebWorker,
  InitializeEnvironment,
  InitializedEnvironment,
  InitializedEnvironmentScript,
  InitializeNextScript,
  RefHandlerCallback,
  ForwardMainTrigger,
  RunStateHandlers,
}

export interface ForwardMainTriggerData {
  $winId$: number;
  $instanceId$: number;
  $forward$: PartytownForwardProperty;
  $args$: SerializedTransfer | undefined;
}

export interface RefHandlerCallbackData {
  $winId$: number;
  $instanceId$: number;
  $refId$: number;
  $thisArg$: SerializedTransfer | undefined;
  $args$: SerializedTransfer | undefined;
}

export type PostMessageToWorker = (msg: MessageFromSandboxToWorker) => void;

export interface MainWindowContext {
  $winId$: number;
  $isInitialized$?: number;
  $startTime$?: number;
  $url$: string;
  $window$: MainWindow;
  $instanceIds$: WeakMap<any, number>;
  $instances$: [number, any][];
}

export interface PartytownWebWorker extends Worker {
  postMessage: PostMessageToWorker;
}

export interface InitWebWorkerData {
  $config$: PartytownConfig;
  $htmlConstructors$: string[];
  $interfaces$: InterfaceInfo[];
  $libPath$?: string;
}

export interface InitWebWorkerContext {
  $isInitialized$?: number;
  $postMessage$: (msg: MessageFromWorkerToSandbox) => void;
}

export interface WebWorkerContext extends InitWebWorkerData, InitWebWorkerContext {}

export interface InitializeEnvironmentData {
  $winId$: number;
  $parentWinId$: number;
  $isTop$: boolean;
  $url$: string;
}

export interface WebWorkerEnvironment extends Omit<InitializeEnvironmentData, '$url$'> {
  $window$?: WorkerWindow;
  $location$?: Location;
  $currentScriptId$?: number;
  $currentScriptUrl$?: string;
  $globals$?: WebWorkerGlobal[];
  $run$?: (content: string) => void;
  $isInitialized$?: number;
}

export interface WebWorkerGlobal {
  $memberName$: string;
  $interfaceType$: InterfaceType;
  $implementation$: any;
}

export type InterfaceInfo = [InterfaceType, string, MembersInterfaceTypeInfo];

export interface MembersInterfaceTypeInfo {
  [memberName: string]: InterfaceType;
}

export const enum InterfaceType {
  // NodeType 0 not used, so using for Window interface
  Window = 0,

  // https://developer.mozilla.org/en-US/docs/Web/API/Node/nodeType
  Element = 1,
  AttributeNode = 2,
  TextNode = 3,
  CDataSectionNode = 4,
  ProcessingInstructionNode = 7,
  CommentNode = 8,
  Document = 9,
  DocumentTypeNode = 10,
  DocumentFragmentNode = 11,

  // Global Constructors and window function implementations
  Primitive = 12,
  Function = 13,
  CSSStyleDeclaration = 14,
  DOMStringMap = 15,
  DOMTokenList = 16,
  History = 17,
  Location = 18,
  MutationObserver = 19,
  NodeList = 20,
  NamedNodeMap = 21,
  Screen = 22,
  Storage = 23,
}

export const enum TargetSetterType {
  SetToMainProxy,
  SetToTarget,
}

export const enum PlatformInstanceId {
  window,
  document,
  documentElement,
  head,
  body,
}

export interface InitializeScriptData {
  $winId$: number;
  $instanceId$: number;
  $content$?: string;
  $url$?: string;
}

export const enum AccessType {
  Get,
  Set,
  CallMethod,
  GlobalConstructor,
}

export interface MainAccessRequest {
  $msgId$: number;
  $winId$: number;
  $contextWinId$?: number;
  // $forwardToWorkerAccess$: boolean;
  $instanceId$: number;
  $interfaceType$: InterfaceType;
  $nodeName$?: string;
  $accessType$: AccessType;
  $memberPath$: string[];
  $data$?: SerializedTransfer;
  $immediateSetters$?: ImmediateSetter[];
  $newInstanceId$?: number;
}

export type ImmediateSetter = [string[], SerializedTransfer | undefined];

export interface MainAccessResponse {
  $msgId$: number;
  $winId$: number;
  $error$?: string;
  $contextWinId$?: number;
  $rtnValue$?: SerializedTransfer;
  $isPromise$?: any;
}

export const enum SerializedType {
  Array,
  Instance,
  Function,
  Object,
  Primitive,
  Ref,
}

export type SerializedArrayTransfer = [SerializedType.Array, (SerializedTransfer | undefined)[]];

export type SerializedInstanceTransfer = [SerializedType.Instance, SerializedInstance];

export type SerializedFunctionTransfer = [SerializedType.Function];

export type SerializedObjectTransfer = [
  SerializedType.Object,
  { [key: string]: SerializedTransfer | undefined }
];

export type SerializedPrimitiveTransfer =
  | [SerializedType.Primitive, string | number | boolean | null | undefined]
  | [SerializedType.Primitive];

export type SerializedRefTransfer = [SerializedType.Ref, SerializedRefTransferData];

export interface SerializedRefTransferData {
  $winId$: number;
  $instanceId$: number;
  $refId$: number;
}

export type SerializedTransfer =
  | SerializedArrayTransfer
  | SerializedInstanceTransfer
  | SerializedFunctionTransfer
  | SerializedObjectTransfer
  | SerializedPrimitiveTransfer
  | SerializedPrimitiveTransfer
  | SerializedRefTransfer
  | [];

export interface SerializedInstance {
  $winId$: number;
  $instanceId$?: number;
  /**
   * Node Type for Element (1), Text (3) and Document (9)
   */
  $interfaceType$: InterfaceType;
  /**
   * Node name for Node instances
   */
  $nodeName$?: string;
  /**
   * Node list data
   */
  $items$?: any[];
}

/**
 * @public
 */
export interface PartytownConfig {
  /**
   * When set to `true`, Partytown scripts are not inlined and not minified.
   */
  debug?: boolean;
  /**
   * Many third-party scripts provide a global variable which user code calls
   * in order to send data to the service. For example, Google Tag Manager uses
   * a [Data Layer](https://developers.google.com/tag-manager/devguide) array,
   * and by pushing data to the array, the data is then sent on to GTM. Because
   * we're moving third-party scripts to a web worker, the main thread needs to
   * know which variables to patch first, and when Partytown loads, it can then
   * forward the event data on to the service.
   *
   * Below is an example of Google Tag Manager, Hubspot and Intercom forward configs:
   *
   * ```js
   * [['dataLayer', 1], ['_hsq', 1], ['Intercom']]
   * ```
   */
  forward?: PartytownForwardProperty[];
  /**
   * Root directory the Partytown library files can be found.
   * The library path must end with a `/`.
   * By default the files will load from the server's `/~partytown/` directory.
   */
  lib?: string;
  /**
   * Log method calls (debug mode required)
   */
  logCalls?: boolean;
  /**
   * Log getter calls (debug mode required)
   */
  logGetters?: boolean;
  /**
   * Log setter calls (debug mode required)
   */
  logSetters?: boolean;
  /**
   * Log Image() src requests (debug mode required)
   */
  logImageRequests?: boolean;
  /**
   * Log script executions (debug mode required)
   */
  logScriptExecution?: boolean;
  /**
   * Log navigator.sendBeacon() requests (debug mode required)
   */
  logSendBeaconRequests?: boolean;
  /**
   * Log stack traces (debug mode required)
   */
  logStackTraces?: boolean;
}

/**
 * The property to patch on `window`, such as `dataLayer` for Google Tag Manager.
 *
 * @public
 */
export type PartytownForwardPropertyName = string;

/**
 * The type of property which is patched on `window`. For example, Google Tag Manager's
 * `dataLayer` is an array, so it's type should be `1`. The default, which is `undefined`,
 * treats the property as a function.
 *
 * @public
 */
export type PartytownForwardPropertyType = PartytownForwardPropertyArrayType | undefined;

/**
 * Default foward property type, which sets the property as a function.
 *
 * @public
 */
export type PartytownForwardPropertyFunctionType = undefined;

/**
 * Sets the forward property as an array.
 *
 * @public
 */
export type PartytownForwardPropertyArrayType = 1;

/**
 * A foward property to patch on the global. The foward config property is an array,
 * with the value at index 0 being the property name to patch. Optionally, the value
 * at index 1 can set what type of property it is. By default it is patched as a
 * function, and when set to `1`, it is patched as an array.
 *
 * @public
 */
export type PartytownForwardProperty = [
  PartytownForwardPropertyName,
  PartytownForwardPropertyFunctionType?
];

export interface MainWindow extends Window {
  partytown?: PartytownConfig;
  _ptf?: any[];
}

export const enum NodeName {
  Body = 'BODY',
  Comment = '#comment',
  Document = '#document',
  /**
   * <html>
   */
  DocumentElement = 'HTML',
  /**
   * <!DOCTYPE html>
   */
  DocumentTypeNode = 'html',
  DocumentFragment = '#document-fragment',
  IFrame = 'IFRAME',
  Head = 'HEAD',
  Script = 'SCRIPT',
  Text = '#text',
}

export const enum StateProp {
  errorHandlers = 'error',
  loadHandlers = 'load',
  href = 'href',
  loadError = 1,
  partyWinId = 2,
  url = 3,
}

export type EventHandler = (ev: any) => void;

export type RefHandler = (...args: any[]) => void;

export type StateMap = Record<number, StateRecord>;

export type StateRecord = Record<string | number, any>;

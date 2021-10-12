import { callMethod, createGlobalConstructorProxy, proxy } from './worker-proxy';
import { constructInstance } from './worker-constructors';
import { constructDocumentElementChild, HTMLDocument } from './worker-document';
import { debug, logWorker, normalizedWinId } from '../utils';
import {
  environments,
  InterfaceTypeKey,
  TargetSetterKey,
  webWorkerCtx,
  WinIdKey,
} from './worker-constants';
import type { HTMLElement } from './worker-element';
import {
  InitializeEnvironmentData,
  InterfaceType,
  NodeName,
  PlatformInstanceId,
  TargetSetterType,
  WebWorkerGlobal,
  WorkerMessageType,
} from '../types';
import { Location } from './worker-location';
import { Window } from './worker-window';

export const createEnvironment = ({
  $winId$,
  $parentWinId$,
  $isTop$,
  $url$,
}: InitializeEnvironmentData) => {
  if (environments[$winId$]) {
    environments[$winId$].$location$.href = $url$;
    return;
  }

  const $window$ = constructInstance(
    InterfaceType.Window,
    PlatformInstanceId.window,
    $winId$
  ) as Window;

  const $document$ = constructInstance(
    InterfaceType.Document,
    PlatformInstanceId.document,
    $winId$,
    NodeName.Document
  ) as HTMLDocument;

  const $documentElement$ = constructInstance(
    InterfaceType.Element,
    PlatformInstanceId.documentElement,
    $winId$,
    NodeName.DocumentElement
  ) as HTMLElement;

  const $head$ = constructDocumentElementChild(
    $winId$,
    PlatformInstanceId.head,
    'Head'
  ) as HTMLElement;

  const $body$ = constructDocumentElementChild(
    $winId$,
    PlatformInstanceId.body,
    'Body'
  ) as HTMLElement;

  environments[$winId$] = {
    $winId$,
    $parentWinId$,
    $window$,
    $document$,
    $documentElement$,
    $head$,
    $body$,
    $location$: new Location($url$),
    $isTop$,
    $run$: (content: string) => {
      const fnArgs = [...globalNames, content];
      const runInEnv = new Function(...fnArgs);
      runInEnv.apply($window$, globalImplementations);
    },
  };

  const interfaces = webWorkerCtx.$interfaces$;

  const htmlCstrNames = webWorkerCtx.$htmlConstructors$;

  const winInterface = interfaces[0];

  const winMembersTypeInfo = winInterface[2];

  const envGlobals = Object.getOwnPropertyNames(Window.prototype)
    .filter((m) => m !== 'constructor')
    .map(($memberName$) => {
      const $implementation$ = ($window$ as any)[$memberName$];
      const glb: WebWorkerGlobal = {
        $interfaceType$: $implementation$[InterfaceTypeKey],
        $memberName$,
        $implementation$,
      };
      return glb;
    });

  const isValidGlobal = (globalName: string) =>
    !(globalName in self) && !envGlobals.some((g) => g.$memberName$ === globalName);

  $window$[TargetSetterKey] = TargetSetterType.SetToTarget;

  Object.keys(winMembersTypeInfo).forEach(($memberName$) => {
    const $interfaceType$ = winMembersTypeInfo[$memberName$];
    const isDocument = $interfaceType$ === InterfaceType.Document;
    const isFunctionInterface = $interfaceType$ === InterfaceType.Function;
    const isValidInterface =
      isDocument || isFunctionInterface || $interfaceType$ > InterfaceType.DocumentFragmentNode;

    if (isValidInterface && isValidGlobal($memberName$)) {
      // this global doesn't already exist in the worker globalThis
      // and the interface type isn't a DOM Node or Window object
      const $implementation$ = (($window$ as any)[$memberName$] = isFunctionInterface
        ? (...args: any[]) => callMethod($window$, [$memberName$], args)
        : isDocument
        ? constructInstance(InterfaceType.Document, PlatformInstanceId.document, $winId$)
        : proxy($interfaceType$, $window$, [$memberName$]));

      const winGlobal: WebWorkerGlobal = {
        $interfaceType$,
        $memberName$,
        $implementation$,
      };

      envGlobals.push(winGlobal);
    }
  });

  interfaces.map((i) => {
    const $interfaceType$ = i[0];
    const $memberName$ = i[1];
    const $implementation$ = createGlobalConstructorProxy($winId$, $interfaceType$, $memberName$);
    if (isValidGlobal($memberName$)) {
      envGlobals.push({
        $implementation$,
        $interfaceType$,
        $memberName$,
      });
    }
  });

  const globalNames = envGlobals.map((g) => g.$memberName$);
  const globalImplementations = globalNames.map(
    ($memberName$) => envGlobals.find((g) => g.$memberName$ === $memberName$)!.$implementation$
  );

  envGlobals.map((glb) => (($window$ as any)[glb.$memberName$] = glb.$implementation$));

  htmlCstrNames.map(
    (htmlCstrName) => (($window$ as any)[htmlCstrName] = (self as any)[htmlCstrName])
  );

  $window$[TargetSetterKey] = TargetSetterType.SetToMainProxy;

  if (debug) {
    const winType = $isTop$ ? 'top' : 'iframe';
    logWorker(
      `Created ${winType} window ${normalizedWinId($winId$)} environment (${$winId$})`,
      $winId$
    );
  }

  webWorkerCtx.$postMessage$([WorkerMessageType.InitializeNextScript, $winId$]);
};

export const getEnv = (instance: { [WinIdKey]: number }) => environments[instance[WinIdKey]];

export const getEnvWindow = (instance: { [WinIdKey]: number }) => getEnv(instance).$window$;

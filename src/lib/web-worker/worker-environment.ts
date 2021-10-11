import { callMethod, createGlobalConstructorProxy, proxy } from './worker-proxy';
import { constructInstance } from './worker-constructors';
import { debug, logWorker, normalizedWinId } from '../utils';
import {
  environments,
  InterfaceTypeKey,
  TargetSetterKey,
  webWorkerCtx,
  WinIdKey,
} from './worker-constants';
import {
  InitializeEnvironmentData,
  InterfaceType,
  PlatformInstanceId,
  TargetSetterType,
  WebWorkerGlobal,
  WorkerMessageType,
} from '../types';
import { Location } from './worker-location';
import { Window } from './worker-window';

export const createEnvironment = (
  glbThis: any,
  { $winId$, $parentWinId$, $isTop$, $url$ }: InitializeEnvironmentData
) => {
  const env = setEnv($winId$, $parentWinId$, $url$, $isTop$);

  const $window$ = env.$window$!;

  const interfaces = webWorkerCtx.$interfaces$;

  const htmlCstrNames = webWorkerCtx.$htmlConstructors$;

  const winInterface = interfaces[0];

  const winMembersTypeInfo = winInterface[2];

  const $globals$ = Object.getOwnPropertyNames(Window.prototype)
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
    !(globalName in glbThis) && !$globals$.some((g) => g.$memberName$ === globalName);

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

      $globals$.push(winGlobal);
    }
  });

  interfaces.map((i) => {
    const $interfaceType$ = i[0];
    const $memberName$ = i[1];
    const $implementation$ = createGlobalConstructorProxy($winId$, $interfaceType$, $memberName$);
    if (isValidGlobal($memberName$)) {
      $globals$.push({
        $implementation$,
        $interfaceType$,
        $memberName$,
      });
    }
  });

  const globalNames = $globals$.map((g) => g.$memberName$);
  const globalImplementations = globalNames.map(
    ($memberName$) => $globals$.find((g) => g.$memberName$ === $memberName$)!.$implementation$
  );

  $globals$.map((glb) => (($window$ as any)[glb.$memberName$] = glb.$implementation$));

  htmlCstrNames.map((htmlCstrName) => (($window$ as any)[htmlCstrName] = glbThis[htmlCstrName]));

  env.$run$ = (content: string) => {
    const fnArgs = [...globalNames, content];
    const runInEnv = new Function(...fnArgs);
    runInEnv.apply($window$, globalImplementations);
  };

  $window$[TargetSetterKey] = TargetSetterType.SetToMainProxy;

  if (debug) {
    const winType = env.$isTop$ ? 'top' : 'iframe';
    logWorker(
      `Created ${winType} window ${normalizedWinId($winId$)} environment (${$winId$})`,
      $winId$
    );
  }

  webWorkerCtx.$postMessage$([WorkerMessageType.InitializeNextScript, $winId$]);
};

export const getEnv = (instance: { [WinIdKey]: number }) => environments[instance[WinIdKey]];

export const getEnvWindow = (instance: { [WinIdKey]: number }) => getEnv(instance).$window$!;

export const getEnvDocument = (instance: { [WinIdKey]: number }) => getEnvWindow(instance).document;

export const setEnv = ($winId$: number, $parentWinId$: number, url: string, $isTop$?: boolean) => {
  const env = (environments[$winId$] = environments[$winId$] || {
    $winId$,
    $parentWinId$,
    $isTop$,
  });

  if (env.$location$) {
    env.$location$.href = url;
  } else {
    env.$location$ = new Location(url);
  }

  env.$window$ =
    env.$window$ ||
    (constructInstance(InterfaceType.Window, PlatformInstanceId.window, $winId$) as any);

  return env;
};

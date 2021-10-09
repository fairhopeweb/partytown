import { callMethod, createGlobalConstructorProxy, proxy } from './worker-proxy';
import { constructInstance } from './worker-constructors';
import { createImageConstructor } from './worker-image';
import { environments, webWorkerCtx, WinIdKey } from './worker-constants';
import {
  InitializeEnvironmentData,
  InterfaceType,
  PlatformInstanceId,
  WebWorkerGlobal,
  WorkerMessageType,
} from '../types';
import { Location } from './worker-location';
import { logWorker } from '../utils';
import { Window } from './worker-window';

export const createEnvironment = (glbThis: any, initEnvData: InitializeEnvironmentData) => {
  const $winId$ = initEnvData.$winId$;

  const $window$ = new Window(glbThis, $winId$);

  const $location$ = new Location(initEnvData.$url$);

  const interfaces = webWorkerCtx.$interfaces$;

  const htmlCstrNames = webWorkerCtx.$htmlConstructors$;

  const winInterface = interfaces[0];

  const winMembersTypeInfo = winInterface[2];

  const winNames = 'window,self,top,parent,globalThis'.split(',');

  const $globals$: WebWorkerGlobal[] = winNames.map(($memberName$) => ({
    $interfaceType$: InterfaceType.Window,
    $memberName$,
    $implementation$: $window$,
  }));

  const isValidGlobal = (globalName: string) =>
    !(globalName in glbThis) && !$globals$.some((g) => g.$memberName$ === globalName);

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

  $globals$.push(
    {
      $interfaceType$: InterfaceType.Location,
      $memberName$: 'location',
      $implementation$: $location$,
    },
    {
      $interfaceType$: InterfaceType.Element,
      $memberName$: 'Image',
      $implementation$: createImageConstructor($winId$),
    },
    {
      $interfaceType$: InterfaceType.Primitive,
      $memberName$: 'name',
      $implementation$: glbThis.name + ` (${$winId$})`,
    }
  );

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

  const $run$ = (content: string) => {
    const fnArgs = [...globalNames, content];
    const runInEnv = new Function(...fnArgs);
    runInEnv.apply($window$, globalImplementations);
  };

  environments[$winId$] = { $winId$, $globals$, $location$, $window$, $run$ };

  logWorker(`Initialized window environment (${$winId$})`, $winId$);

  webWorkerCtx.$postMessage$([WorkerMessageType.InitializeNextScript, $winId$]);
};

export const getEnv = (instance: { [WinIdKey]: number }) => environments[instance[WinIdKey]];

export const getEnvWindow = (instance: { [WinIdKey]: number }) => getEnv(instance).$window$;

export const getEnvDocument = (instance: { [WinIdKey]: number }) => getEnvWindow(instance).document;

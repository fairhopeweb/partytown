import {
  InitializeEnvironmentData,
  InterfaceType,
  PlatformInstanceId,
  WebWorkerEnvironment,
  WebWorkerGlobal,
  WorkerMessageType,
} from '../types';
import { logWorker } from '../utils';
import { Location } from './worker-location';
import { webWorkerCtx } from './worker-constants';
import { Window } from './worker-window';
import { callMethod, createGlobalConstructorProxy, proxy } from './worker-proxy';
import { constructInstance } from './worker-constructors';

export const createEnvironment = (glbThis: any, initEnvData: InitializeEnvironmentData) => {
  const $winId$ = initEnvData.$winId$;

  const $location$ = new Location(initEnvData.$url$);

  const interfaces = webWorkerCtx.$interfaces$;

  const htmlCstrNames = webWorkerCtx.$htmlConstructors$;

  const winInterface = interfaces[0];

  const winMembersTypeInfo = winInterface[2];

  const win = new Window(glbThis, $winId$);

  const winNames = 'window self top parent globalThis'.split(' ');

  const $globals$: WebWorkerGlobal[] = winNames.map(($memberName$) => ({
    $interfaceType$: InterfaceType.Window,
    $memberName$,
    $implementation$: win,
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

      const $implementation$ = ((win as any)[$memberName$] = isFunctionInterface
        ? (...args: any[]) => callMethod(win, [$memberName$], args)
        : isDocument
        ? constructInstance(InterfaceType.Document, PlatformInstanceId.document, $winId$)
        : proxy($interfaceType$, win, [$memberName$]));

      const winGlobal: WebWorkerGlobal = {
        $interfaceType$,
        $memberName$,
        $implementation$,
      };

      $globals$.push(winGlobal);
    }
  });

  $globals$.push({
    $interfaceType$: InterfaceType.Primitive,
    $memberName$: 'name',
    $implementation$: glbThis.name + ` (${$winId$})`,
  });

  interfaces.forEach((i) => {
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

  $globals$.forEach((glb) => ((win as any)[glb.$memberName$] = glb.$implementation$));

  htmlCstrNames.forEach((htmlCstrName) => ((win as any)[htmlCstrName] = glbThis[htmlCstrName]));

  const $run$ = (content: string) => {
    const fnArgs = [...globalNames, content];
    const runInEnv = new Function(...fnArgs);

    runInEnv(...globalImplementations);
  };

  const env: WebWorkerEnvironment = { $winId$, $globals$, $location$, $run$ };

  webWorkerCtx.$environments$[$winId$] = env;

  logWorker(`Initialized web worker window (${$winId$})`, $winId$);

  webWorkerCtx.$postMessage$([WorkerMessageType.InitializeNextEnvironmentScript, $winId$]);
};

// export const initWebWorkerGlobal = (
//   self: any,
//   windowMemberTypeInfo: MembersInterfaceTypeInfo,
//   interfaces: InterfaceInfo[],
//   htmlCstrNames: string[]
// ) => {
//   self[WinIdKey] = 88; //webWorkerCtx.$winId$;
//   self[InstanceIdKey] = PlatformInstanceId.window;

//   Object.keys(windowMemberTypeInfo).map((memberName) => {
//     const interfaceType = windowMemberTypeInfo[memberName];

//     if (!self[memberName] && interfaceType > InterfaceType.DocumentFragmentNode) {
//       // this global doesn't already exist in the worker
//       // and the interface type isn't a DOM Node or Window object
//       if (interfaceType === InterfaceType.Function) {
//         // this is a global function, like alert()
//         self[memberName] = (...args: any[]) => callMethod(self, [memberName], args);
//       } else {
//         // this is a global implementation, like localStorage
//         self[memberName] = proxy(interfaceType, self, [memberName]);
//       }
//     }
//   });

//   interfaces.map((i) => createGlobalConstructorProxy(self, i[0], i[1]));

//   Object.defineProperty(self, 'location', {
//     get: () => webWorkerCtx.$location$,
//     set: (href) => (webWorkerCtx.$location$.href = href + ''),
//   });

//   self.document = constructInstance(InterfaceType.Document, PlatformInstanceId.document);

//   navigator.sendBeacon = sendBeacon;

//   self.self = self.window = self;

//   // if (webWorkerCtx.$winId$ === TOP_WIN_ID) {
//   //   self.parent = self.top = self;
//   // } else {
//   //   self.parent = constructInstance(
//   //     InterfaceType.Window,
//   //     PlatformInstanceId.window,
//   //     // webWorkerCtx.$parentWinId$
//   //   );

//   //   self.top = constructInstance(InterfaceType.Window, PlatformInstanceId.window, TOP_WIN_ID);
//   // }
//   self.parent = constructInstance(
//     InterfaceType.Window,
//     PlatformInstanceId.window
//     // webWorkerCtx.$parentWinId$
//   );

//   self.top = constructInstance(InterfaceType.Window, PlatformInstanceId.window, TOP_WIN_ID);

//   self.Document = HTMLDocument;
//   self.HTMLElement = self.Element = HTMLElement;
//   self.Image = HTMLImageElement;
//   self.Node = Node;

//   htmlCstrNames.map((htmlCstrName) => {
//     if (!self[htmlCstrName]) {
//       elementConstructors[getTagNameFromConstructor(htmlCstrName)] = self[htmlCstrName] =
//         Object.defineProperty(class extends HTMLElement {}, 'name', {
//           value: htmlCstrName,
//         });
//     }
//   });

//   elementConstructors.A = self.HTMLAnchorElement = HTMLAnchorElement;
//   elementConstructors.BODY = elementConstructors.HEAD = WorkerDocumentElementChild;
//   elementConstructors.IFRAME = self.HTMLIFrameElement = HTMLIFrameElement;
//   elementConstructors.SCRIPT = self.HTMLScriptElement = HTMLScriptElement;
// };

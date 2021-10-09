import { getEnv } from './worker-environment';
import { getInstanceStateValue, setInstanceStateValue } from './worker-state';
import { getter, setter } from './worker-proxy';
import { HTMLSrcElement } from './worker-element';
import { ImmediateSettersKey, InstanceIdKey, WinIdKey } from './worker-constants';
import { resolveUrl } from './worker-exec';
import { serializeForMain } from './worker-serialization';
import { StateProp } from '../types';

export class HTMLScriptElement extends HTMLSrcElement {
  get src() {
    return getInstanceStateValue<string>(this, StateProp.url) || '';
  }
  set src(url: string) {
    url = resolveUrl(getEnv(this), url);
    setInstanceStateValue(this, StateProp.url, url);

    if (this[ImmediateSettersKey]) {
      this[ImmediateSettersKey]!.push([
        ['src'],
        serializeForMain(this[WinIdKey], this[InstanceIdKey], url),
      ]);
    }
  }

  get type() {
    return getter(this, ['type']);
  }
  set type(type: string) {
    if (type !== 'text/javascript') {
      setter(this, ['type'], type);
    }
  }
}

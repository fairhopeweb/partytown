import { getEnv } from './worker-environment';
import { getInstanceStateValue, setInstanceStateValue } from './worker-state';
import { getter, setter } from './worker-proxy';
import { HTMLSrcElement } from './worker-element';
import { ImmediateSettersKey, InstanceIdKey, WinIdKey } from './worker-constants';
import { resolveUrl } from './worker-exec';
import { serializeForMain } from './worker-serialization';
import { StateProp } from '../types';

export class HTMLScriptElement extends HTMLSrcElement {
  get innerHTML() {
    return getInstanceStateValue<string>(this, StateProp.innerHTML) || '';
  }
  set innerHTML(content: string) {
    setInstanceStateValue(this, StateProp.innerHTML, content);
    getEnv(this).$run$!(content);
  }

  get innerText() {
    return this.innerHTML;
  }
  set innerText(content: string) {
    this.innerHTML = content;
  }

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

  get textContent() {
    return this.innerHTML;
  }
  set textContent(content: string) {
    this.innerHTML = content;
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

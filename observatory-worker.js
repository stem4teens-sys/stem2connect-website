import { mountObservatory } from './observatory.js?v=3';

class SceneHost extends EventTarget {
  isConnected = true;
  scrollY = 0;
  setPointerCapture() {}
  getBoundingClientRect() { return { left: 0, top: 0, width: this.width, height: this.height }; }
}
let host, cleanup;
self.addEventListener('message', async ({ data }) => {
  if (data.type === 'init') {
    host = new SceneHost(); Object.assign(host, data); host.canvas = new OffscreenCanvas(data.width, data.height);
    try {
      cleanup = await mountObservatory(host, { matches: data.reduced }, new AbortController().signal);
      self.postMessage({ type: cleanup ? 'ready' : 'unavailable' });
    } catch { self.postMessage({ type: 'unavailable' }); }
  } else if (data.type === 'input' && host) {
    const event = new Event(data.name, { cancelable: true }); Object.assign(event, data.properties);
    host.dispatchEvent(event);
  } else if (data.type === 'resize' && host) {
    Object.assign(host, data); host.dispatchEvent(new Event('resize'));
  } else if (data.type === 'visibility' && host) {
    host.visible = data.visible; host.dispatchEvent(new Event('visibility'));
  } else if (data.type === 'frame-presented' && host) host.framePending = false;
  else if (data.type === 'scroll' && host) host.scrollY = data.y;
  else if (data.type === 'dispose') { host.isConnected = false; cleanup?.(); self.close(); }
});

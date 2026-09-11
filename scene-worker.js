// Decorative WebGL runs here so shader compilation cannot freeze navigation.
import { mountOrbital } from './orbital.js';
import { mountMolecules } from './sculptures.js';

// Transferred canvases use the worker's native frame clock when available.
const nativeFrames = typeof self.requestAnimationFrame === 'function';
if (!nativeFrames) {
  self.requestAnimationFrame = callback => setTimeout(() => callback(performance.now()), 34);
  self.cancelAnimationFrame = clearTimeout;
}
class SceneHost extends EventTarget {
  classList = { add() {}, remove() {} };
  skip = new EventTarget();
  append() {}
  querySelector() { return null; }
  getBoundingClientRect() { return this.bounds || { left: 0, top: 0, width: this.clientWidth, height: this.clientHeight }; }
}
let host, hero, dispose;
self.addEventListener('message', async ({ data }) => {
  try {
    if (data.type === 'init') {
      host = Object.assign(new SceneHost(), data.host, { background: true, flushFrames: !nativeFrames });
      hero = Object.assign(new SceneHost(), data.hero, { hidden: false, flushFrames: !nativeFrames });
      hero.skip.remove = () => {};
      hero.dataset = new Proxy({}, {
        set(target, key, value) { target[key] = value; self.postMessage({ type: 'intro', value }); return true; },
        deleteProperty(target, key) { delete target[key]; self.postMessage({ type: 'intro', value: null }); return true; }
      });
      host.onFrame = () => self.postMessage({ type: 'ready' });
      dispose = await (data.kind === 'orbital' ? mountOrbital(host, hero, { matches: false }) : mountMolecules(host, { matches: false }));
      if (!dispose) self.postMessage({ type: 'unavailable' });

    } else if (data.type === 'resize' && host) {
      Object.assign(host, data.host); Object.assign(hero, data.hero);
      host.dispatchEvent(new Event('resize'));
    } else if (data.type === 'input' && host) {
      const event = new Event('orbital-input'); event.detail = data.input; host.dispatchEvent(event);
    } else if (data.type === 'visibility' && host) {
      host.visible = data.visible; hero.hidden = !data.visible;
      host.dispatchEvent(new Event('visibility')); hero.dispatchEvent(new Event('visibilitychange'));
    } else if (data.type === 'skip' && hero) hero.skip.dispatchEvent(new Event('click'));
    else if (data.type === 'dispose') { dispose?.(); self.close(); }
  } catch (error) { console.warn('Decorative scene unavailable:', error.message); self.postMessage({ type: 'unavailable' }); }
});

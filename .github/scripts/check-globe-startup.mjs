// Exercise the real page/worker bridge with a controllable graphics worker.
// Run with: node .github/scripts/check-globe-startup.mjs
import assert from 'node:assert/strict';
import { mountObservatory } from '../../observatory-client.js';

class Element extends EventTarget {
  attributes = new Map(); children = []; tabIndex = -1;
  classList = (() => {
    const names = new Set();
    return { add: (...v) => v.forEach(n => names.add(n)), remove: (...v) => v.forEach(n => names.delete(n)), contains: n => names.has(n) };
  })();
  setAttribute(name, value) { this.attributes.set(name, value); }
  removeAttribute(name) { this.attributes.delete(name); if (name === 'tabindex') this.tabIndex = -1; }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  prepend(child) { this.children.unshift(child); child.parent = this; }
  append(child) { this.children.push(child); child.parent = this; }
  querySelector(selector) { return this.children.find(c => '.' + c.className === selector) || null; }
  remove() { this.removed = true; if (this.parent) this.parent.children = this.parent.children.filter(c => c !== this); }
  transferControlToOffscreen() { return {}; }
}
class FakeWorker extends EventTarget {
  messages = [];
  constructor() { super(); FakeWorker.last = this; }
  postMessage(message, transfer) { this.messages.push({ message, transfer }); }
  terminate() { this.terminated = true; }
  emit(type) { const event = new Event('message'); event.data = { type }; this.dispatchEvent(event); }
}
class Observer { observe() {} disconnect() {} }
Object.assign(globalThis, {
  Worker: FakeWorker, OffscreenCanvas: class {}, HTMLCanvasElement: Element,
  ResizeObserver: Observer, IntersectionObserver: Observer,
  requestAnimationFrame: () => 1, cancelAnimationFrame() {},
  window: Object.assign(new EventTarget(), { Worker: FakeWorker, OffscreenCanvas: class {}, scrollY: 0 }),
  document: Object.assign(new EventTarget(), { hidden: false, createElement: () => new Element() }),
});
const turns = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };
async function start(reduced = false) {
  const requests = [];
  globalThis.fetch = (url, { signal }) => new Promise((resolve, reject) => {
    requests.push({ url, signal, resolve, reject });
    signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  });
  const host = Object.assign(new Element(), { clientWidth: 800, clientHeight: 900 });
  host.setAttribute('aria-busy', 'true');
  const controller = new AbortController();
  const dispose = await mountObservatory(host, { matches: reduced }, controller.signal);
  return { host, controller, requests, dispose, worker: FakeWorker.last };
}

{
  const r = await start();
  try {
    assert.equal(r.host.tabIndex, -1, 'A loading globe must not take keyboard focus');
    assert.equal(r.host.querySelector('.observatory-poster'), null, 'Normal startup must not download a static preview');
    assert.equal(r.requests.length, 2);
    r.worker.emit('ready');
    assert.ok(!r.host.classList.contains('is-ready'), 'A prepared offscreen scene must still wait for its first frame');
    r.worker.emit('painted');
    assert.ok(r.host.classList.contains('is-ready'), 'Reveal the globe on its first interactive frame');
    assert.ok(r.host.classList.contains('has-live-scene'));
    assert.equal(r.host.tabIndex, 0, 'The first visible globe must accept keyboard input');
    assert.equal(r.host.getAttribute('aria-busy'), null);
    const key = new Event('keydown', { cancelable: true });
    key.key = 'ArrowRight';
    r.host.getBoundingClientRect = () => ({ left: 0, top: 0 });
    r.host.dispatchEvent(key);
    assert.ok(key.defaultPrevented);
    assert.equal(r.worker.messages.at(-1).message.properties.key, 'ArrowRight', 'Keyboard input reaches the worker immediately after the first frame');
  } finally { r.dispose(); }
}
{
  const r = await start(true);
  assert.equal(r.requests.length, 0, 'Reduced motion must not start texture downloads');
  assert.ok(r.host.classList.contains('is-static'));
  const poster = r.host.querySelector('.observatory-poster');
  assert.ok(poster, 'Keep an image fallback for reduced motion');
  poster.dispatchEvent(new Event('load'));
  assert.ok(r.host.classList.contains('is-ready'));
  assert.equal(r.host.tabIndex, -1);
  r.dispose();
}
{
  const r = await start();
  r.requests[0].resolve({ ok: false }); await turns();
  assert.ok(r.worker.terminated);
  assert.ok(r.requests[1].signal.aborted);
  assert.ok(r.host.classList.contains('is-static'));
  assert.ok(r.host.querySelector('.observatory-poster'));
  r.worker.emit('painted');
  assert.ok(!r.host.classList.contains('has-live-scene'), 'A stopped worker must not replace the failure fallback');
}
{
  const r = await start();
  r.controller.abort(); await turns();
  assert.ok(r.worker.terminated);
  assert.equal(r.host.children.length, 0, 'Abort must remove the canvas without starting a poster download');
  assert.ok(r.requests.every(q => q.signal.aborted));
}
console.log('Pass: first-frame interaction, no normal poster request, reduced-motion fallback, error fallback and cancellation.');

/* The globe and its data are requested only where the desktop hero has spare room. */
import { mountObservatory } from './observatory-client.js';

(() => {
  const source = import.meta.url;
  const hero = document.querySelector('#home.hero');
  if (!hero) return;
  const wide = matchMedia('(min-width: 1680px) and (hover: hover) and (pointer: fine)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let generation = 0, cleanup, host, request;
  // Keep the complete scene off the initial page-load path. Abort pending work on resize.
  function whenIdle(signal) {
    return new Promise(resolve => {
      let idle, timer;
      const finish = () => {
        window.removeEventListener('DOMContentLoaded', queue);
        document.removeEventListener('visibilitychange', queue);
        if (idle !== undefined) cancelIdleCallback(idle);
        clearTimeout(timer); signal.removeEventListener('abort', finish); resolve();
      };
      const queue = () => {
        if (document.readyState === 'loading' || document.hidden || idle !== undefined || timer) return;
        if ('requestIdleCallback' in window) idle = requestIdleCallback(finish, { timeout: 250 });
        else timer = setTimeout(finish, 80);
      };
      signal.addEventListener('abort', finish, { once: true });
      window.addEventListener('DOMContentLoaded', queue, { once: true });
      document.addEventListener('visibilitychange', queue);
      queue();
    });
  }
  function whenVisible(element, signal) {
    return new Promise(resolve => {
      const finish = () => { observer.disconnect(); signal.removeEventListener('abort', finish); resolve(); };
      const observer = new IntersectionObserver(entries => { if (entries[0].isIntersecting) finish(); });
      signal.addEventListener('abort', finish, { once: true });
      observer.observe(element);
    });
  }
  async function refresh() {
    const current = ++generation;
    request?.abort(); cleanup?.(); cleanup = undefined;
    host?.remove(); host = undefined;
    if (!wide.matches) return;
    request = new AbortController();
    const signal = request.signal;
    const element = document.createElement('div');
    element.className = 'world-observatory';
    element.setAttribute('role', 'img');
    element.setAttribute('aria-label', 'Interactive globe with student figures reading and waving around the world. Drag or use the arrow keys to rotate.');
    element.tabIndex = 0;
    const poster = document.createElement('img');
    poster.className = 'observatory-poster'; poster.alt = ''; poster.decoding = 'async';
    poster.src = new URL('assets/models/globe-poster.webp', source).href;
    poster.addEventListener('load', () => element.classList.add('is-ready'), { once: true });
    element.append(poster);
    host = element; hero.append(element);
    try {
      await whenIdle(signal);
      if (signal.aborted) return;
      await whenVisible(element, signal);
      if (signal.aborted) return;
      if (current !== generation) return;
      const dispose = await mountObservatory(element, reduced, signal);
      if (current !== generation) { dispose?.(); return; }
      cleanup = dispose;
      if (dispose) element.classList.add('is-ready');
      else element.remove();
    } catch (error) {
      if (current === generation) element.classList.add('is-ready', 'is-static');
      if (error.name !== 'AbortError') console.warn('Desktop globe could not be loaded. The website remains available.');
    }
  }
  wide.addEventListener('change', refresh);
  reduced.addEventListener('change', refresh);
  refresh();
})();

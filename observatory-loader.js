/* The globe and its data are requested only where the desktop hero has spare room. */
import { mountObservatory, showStaticObservatory } from './observatory-client.js';

(() => {
  const hero = document.querySelector('#home.hero');
  if (!hero) return;
  const wide = matchMedia('(min-width: 1680px) and (hover: hover) and (pointer: fine)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let generation = 0, cleanup, host, request;
  // The module runs after parsing. Start visible graphics without an idle delay,
  // while keeping hidden tabs and offscreen heroes free of graphics downloads.
  function whenVisible(element, signal) {
    return new Promise(resolve => {
      let inView = false;
      const finish = () => {
        observer.disconnect(); document.removeEventListener('visibilitychange', check);
        signal.removeEventListener('abort', finish); resolve();
      };
      const check = () => { if (inView && !document.hidden) finish(); };
      const observer = new IntersectionObserver(entries => { inView = entries[0].isIntersecting; check(); });
      signal.addEventListener('abort', finish, { once: true });
      document.addEventListener('visibilitychange', check);
      observer.observe(element);
      if (signal.aborted) finish();
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
    element.setAttribute('aria-busy', 'true');
    host = element; hero.append(element);
    try {
      await whenVisible(element, signal);
      if (signal.aborted) return;
      if (current !== generation) return;
      const dispose = await mountObservatory(element, reduced, signal);
      if (current !== generation) { dispose?.(); return; }
      cleanup = dispose;
    } catch (error) {
      if (current === generation && !signal.aborted) showStaticObservatory(element);
      if (error.name !== 'AbortError') console.warn('Desktop globe could not be loaded. The website remains available.');
    }
  }
  wide.addEventListener('change', refresh);
  reduced.addEventListener('change', refresh);
  refresh();
})();

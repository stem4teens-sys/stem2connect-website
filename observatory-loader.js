/* The globe and its data are requested only where the desktop hero has spare room. */
(() => {
  const source = document.currentScript.src;
  const hero = document.querySelector('#home.hero');
  if (!hero) return;
  const wide = matchMedia('(min-width: 1680px) and (hover: hover) and (pointer: fine)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let generation = 0, cleanup, host, request;
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
    element.setAttribute('aria-label', 'Interactive globe illustrating global STEM connections. Drag or use the arrow keys to rotate.');
    element.tabIndex = 0;
    host = element; hero.append(element);
    try {
      const module = await import(new URL('observatory.js?v=1', source).href);
      if (current !== generation) return;
      const dispose = await module.mountObservatory(element, reduced, signal);
      if (current !== generation) { dispose?.(); return; }
      cleanup = dispose;
      if (dispose) element.classList.add('is-ready');
      else element.remove();
    } catch (error) {
      if (current === generation) element.remove();
      if (error.name !== 'AbortError') console.warn('Desktop globe could not be loaded. The website remains available.');
    }
  }
  wide.addEventListener('change', refresh);
  reduced.addEventListener('change', refresh);
  refresh();
})();

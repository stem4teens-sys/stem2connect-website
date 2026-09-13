// This small bridge is the only globe module evaluated on the page itself.
export function showStaticObservatory(host) {
  if (host.querySelector('.observatory-poster')) return;
  host.classList.remove('has-live-scene', 'is-ready');
  host.classList.add('is-static');
  host.removeAttribute('tabindex');
  host.removeAttribute('aria-busy');
  host.setAttribute('aria-label', 'Globe illustrating students learning and connecting around the world.');
  const poster = document.createElement('img');
  poster.className = 'observatory-poster'; poster.alt = ''; poster.decoding = 'async';
  poster.addEventListener('load', () => host.classList.add('is-ready'), { once: true });
  poster.src = new URL('./assets/models/globe-poster.webp', import.meta.url).href;
  host.append(poster);
}

export async function mountObservatory(host, reduced, signal) {
  if (signal.aborted) return () => {};
  const makeStatic = () => showStaticObservatory(host);
  if (!('Worker' in window) || !('OffscreenCanvas' in window) || !HTMLCanvasElement.prototype.transferControlToOffscreen || reduced.matches) {
    makeStatic(); return () => {};
  }
  const canvas = document.createElement('canvas');
  canvas.className = 'observatory-canvas'; canvas.setAttribute('aria-hidden', 'true'); host.prepend(canvas);
  let surface;
  try { surface = canvas.transferControlToOffscreen(); }
  catch { canvas.remove(); makeStatic(); return () => {}; }
  let worker;
  try { worker = new Worker(new URL('./assets/runtime/graphics-worker.js?v=1', import.meta.url), { type: 'module' }); }
  catch { canvas.remove(); makeStatic(); return () => {}; }
  let stopped = false, inView = true, pointerFrame = 0, pointer, scrollFrame = 0, startup;
  const textureRequest = new AbortController();
  const send = data => { if (!stopped) worker.postMessage(data); };
  const visibility = () => send({ type: 'visibility', visible: inView && !document.hidden });
  const resize = new ResizeObserver(() => send({ type: 'resize', width: host.clientWidth, height: host.clientHeight }));
  const observer = new IntersectionObserver(entries => { inView = entries[0].isIntersecting; visibility(); }, { threshold: .05 });
  const forward = event => {
    const bounds = host.getBoundingClientRect();
    return { type: 'input', name: event.type, properties: { clientX: event.clientX - bounds.left, clientY: event.clientY - bounds.top, button: event.button, pointerId: event.pointerId, key: event.key } };
  };
  const move = event => {
    pointer = forward(event);
    if (!pointerFrame) pointerFrame = requestAnimationFrame(() => { pointerFrame = 0; send(pointer); });
  };
  const input = event => {
    if (event.type === 'pointerdown' && event.button === 0) host.setPointerCapture(event.pointerId);
    if (event.type === 'keydown' && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(event.key)) event.preventDefault();
    if (pointerFrame) { cancelAnimationFrame(pointerFrame); pointerFrame = 0; send(pointer); }
    send(forward(event));
  };
  const scroll = () => {
    if (!scrollFrame) scrollFrame = requestAnimationFrame(() => { scrollFrame = 0; send({ type: 'scroll', y: window.scrollY }); });
  };
  const events = ['pointerdown','pointerup','pointercancel','pointerleave','focus','blur','keydown'];
  const dispose = () => {
    if (stopped) return;
    stopped = true; clearTimeout(startup); textureRequest.abort(); worker.terminate(); resize.disconnect(); observer.disconnect();
    cancelAnimationFrame(pointerFrame); cancelAnimationFrame(scrollFrame);
    events.forEach(name => host.removeEventListener(name, input)); host.removeEventListener('pointermove', move);
    document.removeEventListener('visibilitychange', visibility); window.removeEventListener('scroll', scroll);
    signal.removeEventListener('abort', dispose); canvas.remove();
  };
  const unavailable = () => {
    if (stopped) return;
    dispose(); makeStatic();
  };
  // A stalled renderer falls back once; a preview never replaces normal startup.
  startup = setTimeout(unavailable, 20000);
  worker.addEventListener('error', unavailable, { once: true });
  worker.addEventListener('message', ({ data }) => {
    if (data.type === 'painted') {
      if (stopped) return;
      clearTimeout(startup);
      host.classList.remove('is-static');
      host.removeAttribute('aria-busy');
      host.tabIndex = 0;
      host.classList.add('has-live-scene', 'is-ready');
    }
    // A prepared scene may be offscreen; keep it ready for the next scroll back.
    else if (data.type === 'ready') clearTimeout(startup);
    else if (data.type === 'unavailable') unavailable();
  });
  worker.postMessage({ type: 'init', canvas: surface, transferTextures: true, width: host.clientWidth, height: host.clientHeight, visible: !document.hidden, reduced: reduced.matches }, [surface]);
  // Start these requests while the worker and its engine are downloading.
  // Transfer the small compressed files once; decoding stays in the worker.
  Promise.all(['earth-color.webp', 'earth-relief.webp'].map(async name => {
    const response = await fetch(new URL(`./assets/models/${name}`, import.meta.url), { signal: textureRequest.signal });
    if (!response.ok) throw new Error('Globe texture unavailable');
    return response.arrayBuffer();
  })).then(buffers => {
    if (!stopped) worker.postMessage({ type: 'textures', buffers }, buffers);
  }).catch(() => { if (!stopped) unavailable(); });
  events.forEach(name => host.addEventListener(name, input)); host.addEventListener('pointermove', move, { passive: true });
  document.addEventListener('visibilitychange', visibility); window.addEventListener('scroll', scroll, { passive: true });
  resize.observe(host); observer.observe(host); signal.addEventListener('abort', dispose, { once: true });
  if (signal.aborted) dispose();
  return dispose;
}

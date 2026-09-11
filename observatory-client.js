// This small bridge is the only globe module evaluated on the page itself.
export async function mountObservatory(host, reduced, signal) {
  const makeStatic = () => {
    host.classList.remove('has-live-scene'); host.classList.add('is-static'); host.removeAttribute('tabindex');
    host.setAttribute('aria-label', 'Globe illustrating students learning and connecting around the world.');
  };
  if (!('Worker' in window) || !('OffscreenCanvas' in window) || reduced.matches) {
    makeStatic(); return () => {};
  }
  const canvas = document.createElement('canvas');
  canvas.className = 'observatory-canvas'; canvas.setAttribute('aria-hidden', 'true'); host.prepend(canvas);
  const context = canvas.getContext('bitmaprenderer');
  if (!context) { canvas.remove(); makeStatic(); return () => {}; }
  let worker;
  try { worker = new Worker(new URL('./observatory-worker.js?v=3', import.meta.url), { type: 'module' }); }
  catch { canvas.remove(); makeStatic(); return () => {}; }
  let stopped = false, inView = true, pointerFrame = 0, pointer, scrollFrame = 0, startup;
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
    stopped = true; clearTimeout(startup); worker.terminate(); resize.disconnect(); observer.disconnect();
    cancelAnimationFrame(pointerFrame); cancelAnimationFrame(scrollFrame);
    events.forEach(name => host.removeEventListener(name, input)); host.removeEventListener('pointermove', move);
    document.removeEventListener('visibilitychange', visibility); window.removeEventListener('scroll', scroll);
    signal.removeEventListener('abort', dispose); canvas.remove();
  };
  const unavailable = () => {
    dispose(); makeStatic();
  };
  // Unavailable or unusually slow graphics must never leave a blank illustration.
  startup = setTimeout(unavailable, 12000);
  worker.addEventListener('error', unavailable, { once: true });
  worker.addEventListener('message', ({ data }) => {
    if (data.type === 'frame') {
      if (stopped) { data.bitmap.close(); return; }
      if (canvas.width !== data.bitmap.width) canvas.width = data.bitmap.width;
      if (canvas.height !== data.bitmap.height) canvas.height = data.bitmap.height;
      context.transferFromImageBitmap(data.bitmap);
      clearTimeout(startup); send({ type: 'frame-presented' });
      host.classList.add('has-live-scene');
    }
    else if (data.type === 'unavailable') unavailable();
  });
  worker.postMessage({ type: 'init', width: host.clientWidth, height: host.clientHeight, visible: !document.hidden, reduced: reduced.matches });
  events.forEach(name => host.addEventListener(name, input)); host.addEventListener('pointermove', move, { passive: true });
  document.addEventListener('visibilitychange', visibility); window.addEventListener('scroll', scroll, { passive: true });
  resize.observe(host); observer.observe(host); signal.addEventListener('abort', dispose, { once: true });
  if (signal.aborted) dispose();
  return dispose;
}

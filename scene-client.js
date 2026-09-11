// This bridge never imports Three.js or creates a WebGL context on the page.
export function mountScene(host, hero, kind, reduced) {
  if (reduced.matches || !window.Worker || !window.OffscreenCanvas) return () => {};
  const canvas = document.createElement('canvas');
  canvas.className = kind === 'orbital' ? 'orbital-canvas' : 'molecular-canvas';
  canvas.setAttribute('aria-hidden', 'true'); canvas.style.opacity = '0';
  const meteor = kind === 'orbital' ? document.createElement('canvas') : null;
  if (meteor) { meteor.className = 'meteor-canvas'; meteor.setAttribute('aria-hidden', 'true'); }
  let worker, skip, stopped = false, inView = true;
  const send = message => { if (!stopped) worker.postMessage(message); };
  const dimensions = () => {
    const h = hero.getBoundingClientRect(), m = host.getBoundingClientRect();
    return {
      host: { clientWidth: host.clientWidth, clientHeight: host.clientHeight, bounds: { left: m.left - h.left, top: m.top - h.top, width: m.width, height: m.height }, coarse: matchMedia('(pointer: coarse)').matches, dpr: devicePixelRatio, visible: inView && !document.hidden },
      hero: { clientWidth: hero.clientWidth, clientHeight: hero.clientHeight, viewportHeight: innerHeight, dpr: devicePixelRatio }
    };
  };
  const clearIntro = () => { if (meteor) meteor.style.opacity = '0'; delete hero.dataset.intro; skip?.remove(); skip = null; };
  const onResize = () => send({ type: 'resize', ...dimensions() });
  const onInput = event => send({ type: 'input', input: event.detail });
  const onVisibility = () => send({ type: 'visibility', visible: inView && !document.hidden });
  const resize = new ResizeObserver(onResize);
  const visibility = new IntersectionObserver(entries => { inView = entries[0].isIntersecting; onVisibility(); });
  function dispose() {
    if (stopped) return;
    stopped = true; worker?.terminate(); resize.disconnect(); visibility.disconnect();
    host.removeEventListener('orbital-input', onInput); document.removeEventListener('visibilitychange', onVisibility);
    canvas.remove(); meteor?.remove(); host.classList.remove('has-webgl'); clearIntro();
  }
  try {
    worker = new Worker(new URL('./assets/runtime/scene-worker.js', import.meta.url), { type: 'module' });
    host.prepend(canvas); if (meteor) hero.append(meteor);
    const context = canvas.getContext('bitmaprenderer');
    const meteorContext = meteor?.getContext('bitmaprenderer');
    if (!context || (meteor && !meteorContext)) { dispose(); return dispose; }
    let introPlayed = new URLSearchParams(location.search).get('intro') === '0';
    try { introPlayed ||= sessionStorage.getItem('stem2connect-orbit-intro-v2') === '1'; } catch {}
    worker.addEventListener('error', dispose, { once: true });
    worker.addEventListener('message', ({ data }) => {
      if (stopped) { data.bitmap?.close(); return; }
      if (data.type === 'frame') {
        const target = data.kind === 'meteor' ? meteor : canvas;
        const ctx = data.kind === 'meteor' ? meteorContext : context;
        if (target.width !== data.bitmap.width) target.width = data.bitmap.width;
        if (target.height !== data.bitmap.height) target.height = data.bitmap.height;
        ctx.transferFromImageBitmap(data.bitmap);
        send({ type: 'presented', kind: data.kind });
      }
      else if (data.type === 'ready') { canvas.style.opacity = '1'; host.classList.add('has-webgl'); }
      else if (data.type === 'unavailable') dispose();
      else if (data.type === 'intro') {
        if (!data.value) { clearIntro(); return; }
        hero.dataset.intro = data.value; if (meteor) meteor.style.opacity = '1';
        if (data.value === 'flight' && !skip) {
          try { sessionStorage.setItem('stem2connect-orbit-intro-v2', '1'); } catch {}
          skip = document.createElement('button'); skip.className = 'intro-skip'; skip.type = 'button'; skip.textContent = 'Skip animation';
          skip.addEventListener('click', () => { const focused = document.activeElement === skip; send({ type: 'skip' }); clearIntro(); if (focused) hero.querySelector('a')?.focus({ preventScroll: true }); });
          hero.append(skip);
        }
      }
    });
    const size = dimensions();
    worker.postMessage({ type: 'init', kind, ...size,
      hero: { ...size.hero, introPlayed, forceIntro: new URLSearchParams(location.search).get('intro') === '1' } });
    host.addEventListener('orbital-input', onInput); document.addEventListener('visibilitychange', onVisibility);
    resize.observe(host); visibility.observe(host);
  } catch { dispose(); }
  return dispose;
}

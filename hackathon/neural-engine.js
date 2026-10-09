import { buildField, projection } from './neural-geometry.mjs';

const host = document.querySelector('.neural-machine');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const coarse = matchMedia('(pointer: coarse)');
const saver = navigator.connection?.saveData === true;
const canvas = host?.querySelector('.neural-canvas');
const ctx = canvas?.getContext('2d', { alpha: true });
const pause = host?.querySelector('.engine-pause');

if (ctx) {
  const paths = buildField(coarse.matches || saver);
  const colors = ['#2a625c', '#307c6e', '#42917a', '#66b786', '#a6dba0', '#d8ff90', '#e9ffb0'];
  let visible = false, raf = 0, last = 0, elapsed = 0, paused = false, disposed = false;
  let px = 0, py = 0, targetX = 0, targetY = 0, pulse = 0, pulseAge = 0;
  const set = (name, value) => host.style.setProperty(name, value);
  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, coarse.matches ? 1.25 : 1.6);
    const width = Math.min(host.clientWidth, 800);
    canvas.width = Math.round(width * dpr);
    canvas.height = canvas.width;
    ctx.setTransform(canvas.width / 600, 0, 0, canvas.height / 600, 0, 0);
    draw();
  }
  function draw() {
    const project = projection(.92 + py * .13 + Math.sin(elapsed * .11) * .05, -.16 + px * .22, -.37 + Math.sin(elapsed * .08) * .045);
    const buckets = Array.from({ length: 7 }, () => new Path2D());
    for (const path of paths) {
      let previous = project(path[0]);
      for (let j = 1; j < path.length; j++) {
        const point = project(path[j]);
        const bucket = Math.max(0, Math.min(6, Math.floor((point[2] + 172) / 49)));
        buckets[bucket].moveTo(previous[0], previous[1]);
        buckets[bucket].lineTo(point[0], point[1]);
        previous = point;
      }
    }
    ctx.clearRect(0, 0, 600, 600);
    buckets.forEach((path, i) => {
      ctx.strokeStyle = colors[i];
      ctx.globalAlpha = .22 + i * .105;
      ctx.lineWidth = .5 + i * .07;
      ctx.stroke(path);
    });
    // A few travelling signals follow real paths; no random floating particles.
    for (let i = 0; i < 5; i++) {
      const path = paths[(i * 9) % paths.length];
      const head = Math.floor(((elapsed * .035 + i * .21) % 1) * (path.length - 1));
      for (let j = 0; j < 12; j++) {
        const index = (head - j + path.length - 1) % (path.length - 1);
        const a = project(path[index]), b = project(path[index + 1]);
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
        ctx.strokeStyle = i % 2 ? '#d8ff37' : '#83ffeb';
        ctx.globalAlpha = (1 - j / 12) * .9;
        ctx.lineWidth = 1.6; ctx.stroke();
      }
    }
    if (pulse > 0) {
      ctx.beginPath();
      ctx.ellipse(300, 294, 110 + pulseAge * 220, (110 + pulseAge * 220) * .7, -.37, 0, Math.PI * 2);
      ctx.strokeStyle = '#d8ff37'; ctx.globalAlpha = pulse * .65; ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  function mayRun() { return !disposed && visible && !document.hidden && !paused && !reduced.matches && !saver; }
  function frame(now) {
    raf = 0;
    if (!mayRun()) return;
    if (last && now - last < (coarse.matches ? 1000 / 24 : 1000 / 30)) { raf = requestAnimationFrame(frame); return; }
    const dt = last ? Math.min((now - last) / 1000, .07) : 0;
    last = now; elapsed += dt;
    px += (targetX - px) * .08; py += (targetY - py) * .08;
    if (pulse > 0) { pulseAge += dt; pulse = Math.max(0, 1 - pulseAge / 1.2); }
    draw();
    set('--engine-x', `${px * 4}deg`); set('--engine-y', `${py * -4}deg`);
    raf = requestAnimationFrame(frame);
  }
  function sync() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0; last = 0;
    host.classList.toggle('engine-still', !mayRun());
    pause.hidden = reduced.matches || saver;
    pause.setAttribute('aria-label', paused ? 'Play AI visual animation' : 'Pause AI visual animation');
    pause.setAttribute('aria-pressed', String(paused));
    if (mayRun()) raf = requestAnimationFrame(frame);
    else draw();
  }
  const abort = new AbortController();
  const on = (target, name, fn, options = {}) => target.addEventListener(name, fn, { ...options, signal: abort.signal });
  on(host, 'pointermove', event => {
    if (coarse.matches || reduced.matches || paused) return;
    const rect = host.getBoundingClientRect();
    targetX = (event.clientX - rect.left) / rect.width * 2 - 1;
    targetY = (event.clientY - rect.top) / rect.height * 2 - 1;
  }, { passive: true });
  on(host, 'pointerleave', () => { targetX = targetY = 0; });
  on(host, 'click', event => {
    if (event.target.closest('button') || !mayRun()) return;
    pulse = 1; pulseAge = 0;
  });
  on(pause, 'click', () => { paused = !paused; sync(); });
  on(document, 'visibilitychange', sync);
  on(reduced, 'change', sync);
  on(coarse, 'change', resize);
  const intersection = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); });
  const size = new ResizeObserver(resize);
  intersection.observe(host); size.observe(host);
  resize(); host.classList.add('engine-ready'); sync();
  on(window, 'pagehide', event => {
    if (raf) cancelAnimationFrame(raf); raf = 0;
    if (!event.persisted) { disposed = true; abort.abort(); intersection.disconnect(); size.disconnect(); }
  });
  on(window, 'pageshow', sync);
} else if (pause) pause.hidden = true;

// Section details play once; no scroll locks or hidden content while loading.
const sections = document.querySelectorAll('main > .section, main > .apply');
const reveal = new IntersectionObserver(entries => entries.forEach(entry => {
  if (!entry.isIntersecting) return;
  entry.target.classList.add('cinema-entered'); reveal.unobserve(entry.target);
}), { threshold: .08 });
sections.forEach(section => reveal.observe(section));

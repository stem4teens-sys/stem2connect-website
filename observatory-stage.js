import * as THREE from './assets/vendor/three.module.min.js';

// WebGL and shader preparation run in the worker, away from page input and scrolling.
export function createStage(host, className, reduced) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: host.canvas, alpha: true, antialias: true, powerPreference: 'low-power' }); }
  catch { return null; }
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(36, 1, .1, 50);
  const callbacks = [];
  let stopped = false, ready = false, frame = 0, last = 0, elapsed = 0;
  let pixelBudget = 1100000, slowFrames = 0, interval = 1000 / 24;
  const requestFrame = fn => setTimeout(() => fn(performance.now()), interval);
  const cancelFrame = clearTimeout;
  const stage = { scene, camera, renderer, draw: () => {}, resize: () => {}, renderOnce, start, dispose, onDispose: fn => callbacks.push(fn) };
  function renderOnce() {
    if (ready && !stopped && host.visible && !host.framePending) {
      renderer.render(scene, camera);
      renderer.getContext().finish();
      host.framePending = true;
      const bitmap = host.canvas.transferToImageBitmap();
      self.postMessage({ type: 'frame', bitmap }, [bitmap]);
    }
  }
  function size() {
    if (stopped) return;
    const width = Math.max(1, host.width), height = Math.max(1, host.height);
    renderer.setPixelRatio(Math.min(1, Math.sqrt(pixelBudget / (width * height))));
    renderer.setSize(width, height, false);
    camera.aspect = width / height; camera.updateProjectionMatrix(); stage.resize();
    renderOnce(); resume();
  }
  function tick(now) {
    frame = 0;
    if (stopped || !ready || !host.visible || reduced.matches) { last = 0; return; }
    frame = requestFrame(tick);
    if (last && now - last < interval) return;
    const dt = last ? Math.min((now - last) / 1000, .1) : 0;
    if (last && now - last > 90) slowFrames++; else slowFrames = Math.max(0, slowFrames - 1);
    last = now; elapsed += dt;
    if (slowFrames > 16 && pixelBudget > 700000) { pixelBudget = 700000; interval = 1000 / 18; size(); }
    stage.draw({ now, elapsed, dt }); renderOnce();
  }
  function resume() { if (!frame && ready && host.visible && !reduced.matches && !stopped) frame = requestFrame(tick); }
  const visibility = () => {
    cancelFrame(frame); frame = 0; last = 0;
    if (host.visible) { renderOnce(); resume(); }
  };
  host.addEventListener('resize', size); host.addEventListener('visibility', visibility);
  async function start() {
    size();
    try {
      renderer.compile(scene, camera);
      if (stopped) return false;
      ready = true; renderOnce(); resume(); return true;
    } catch (error) { dispose(); throw error; }
  }
  function dispose() {
    if (stopped) return;
    stopped = true; cancelFrame(frame);
    host.removeEventListener('resize', size); host.removeEventListener('visibility', visibility);
    callbacks.forEach(fn => fn());
    const resources = new Set();
    scene.traverse(object => {
      if (object.geometry) resources.add(object.geometry);
      if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => resources.add(material));
    });
    resources.forEach(resource => resource.dispose()); renderer.dispose(); renderer.forceContextLoss();
  }
  host.canvas.addEventListener('webglcontextlost', dispose, { once: true });
  size(); return stage;
}

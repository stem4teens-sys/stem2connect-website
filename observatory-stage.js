import * as THREE from './assets/vendor/three.module.min.js';

// WebGL and shader preparation run in the worker, away from page input and scrolling.
export function createStage(host, className, reduced) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: host.canvas, alpha: true, antialias: true, powerPreference: 'low-power' }); }
  catch { return null; }
  renderer.debug.checkShaderErrors = false;
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(36, 1, .1, 50);
  const callbacks = [];
  let stopped = false, ready = false, frame = 0, last = 0, elapsed = 0, painted = false;
  let pixelBudget = 1100000, slowFrames = 0, interval = 1000 / 24;
  let sizedWidth = 0, sizedHeight = 0, sizedRatio = 0;
  const nativeFrames = typeof self.requestAnimationFrame === 'function';
  const requestFrame = nativeFrames
    ? self.requestAnimationFrame.bind(self) : fn => setTimeout(() => fn(performance.now()), interval);
  const cancelFrame = typeof self.cancelAnimationFrame === 'function' ? self.cancelAnimationFrame.bind(self) : clearTimeout;
  const stage = { scene, camera, renderer, draw: () => {}, resize: () => {}, renderOnce, start, dispose, onDispose: fn => callbacks.push(fn) };
  function renderOnce() {
    if (ready && !stopped && host.visible) {
      renderer.render(scene, camera);
      if (!nativeFrames) renderer.getContext().flush();
      if (!painted) { painted = true; self.postMessage({ type: 'painted' }); }
    }
  }
  function size() {
    if (stopped) return;
    const width = Math.max(1, host.width), height = Math.max(1, host.height);
    const ratio = Math.min(1, Math.sqrt(pixelBudget / (width * height)));
    if (width === sizedWidth && height === sizedHeight && ratio === sizedRatio) return;
    sizedWidth = width; sizedHeight = height; sizedRatio = ratio;
    renderer.setDrawingBufferSize(width, height, ratio);
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
      const compilation = renderer.compileAsync(scene, camera);
      renderer.getContext().flush();
      await compilation;
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

import * as THREE from './assets/vendor/three.module.min.js';

// A small lifecycle shared by the two decorative scenes. Native scrolling stays untouched.
export function createStage(host, className, reduced) {
  let renderer;
  const coarse = matchMedia('(pointer: coarse)').matches;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !coarse, powerPreference: 'low-power' });
  } catch { return null; }
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(devicePixelRatio, coarse ? 1.25 : 1.5));
  const canvas = renderer.domElement;
  canvas.className = className;
  canvas.setAttribute('aria-hidden', 'true');
  host.prepend(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, .1, 50);
  camera.position.z = 6.8;
  const input = { x: 0, y: 0, scroll: 0 };
  const callbacks = [];
  let frame = 0, last = 0, elapsed = 0, visible = false, stopped = false;
  let slowFrames = 0, samples = 0;
  const stage = { scene, camera, renderer, input, width: 1, height: 1, draw: () => {}, resize: () => {}, dispose, onDispose: fn => callbacks.push(fn) };
  function resize() {
    if (stopped) return;
    stage.width = Math.max(1, host.clientWidth);
    stage.height = Math.max(1, host.clientHeight);
    camera.aspect = stage.width / stage.height;
    camera.updateProjectionMatrix();
    renderer.setSize(stage.width, stage.height, false);
    stage.resize();
    resume();
  }
  function draw(now) {
    frame = 0;
    if (stopped || !visible || document.hidden || reduced.matches) { last = 0; return; }
    frame = requestAnimationFrame(draw);
    if (last && now - last < 32) return;
    const dt = last ? Math.min((now - last) / 1000, .08) : 0;
    if (last && ++samples < 100 && now - last > 54) slowFrames++;
    if (samples === 100 && slowFrames > 25) renderer.setPixelRatio(1);
    last = now;
    elapsed += dt;
    stage.draw({ now, elapsed, dt });
    if (!stopped) renderer.render(scene, camera);
  }
  function resume() { if (!frame && !stopped) frame = requestAnimationFrame(draw); }
  const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; if (visible) resume(); }, { threshold: .08 });
  const sizeObserver = new ResizeObserver(resize);
  observer.observe(host); sizeObserver.observe(host);
  const receive = event => { Object.assign(input, event.detail); resume(); };
  host.addEventListener('orbital-input', receive);
  document.addEventListener('visibilitychange', resume);
  function dispose() {
    if (stopped) return;
    stopped = true;
    cancelAnimationFrame(frame);
    observer.disconnect(); sizeObserver.disconnect();
    host.removeEventListener('orbital-input', receive);
    document.removeEventListener('visibilitychange', resume);
    callbacks.forEach(fn => fn());
    const resources = new Set();
    scene.traverse(object => {
      if (object.geometry) resources.add(object.geometry);
      if (object.material) (Array.isArray(object.material) ? object.material : [object.material]).forEach(material => resources.add(material));
    });
    resources.forEach(resource => resource.dispose());
    renderer.dispose(); canvas.remove();
  }
  canvas.addEventListener('webglcontextlost', dispose, { once: true });
  resize();
  return stage;
}

export function lighting(scene) {
  scene.add(new THREE.HemisphereLight(0xfffaf2, 0x303638, 2.2));
  const key = new THREE.DirectionalLight(0xffffff, 3.4);
  key.position.set(-3, 5, 7); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 1.7);
  rim.position.set(4, -1, 2); scene.add(rim);
}

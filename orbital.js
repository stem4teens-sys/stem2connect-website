import { batchStaticMeshes } from './static-batches.js';
import * as THREE from './assets/vendor/three.module.min.js';
import { createStage, lighting } from './three-stage.js';

export async function mountOrbital(machine, hero, reduced) {
  const stage = createStage(machine, 'orbital-canvas', reduced);
  if (!stage) return;
  lighting(stage.scene);
  const sculpture = new THREE.Group(); stage.scene.add(sculpture);
  const cyan = 0x4cf4dc, acid = 0xd8ff37;
  const lineMaterial = (color, opacity = 1) => new THREE.LineBasicMaterial({ color, transparent: true, opacity });
  function path(points, material, parent = sculpture) {
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material);
    parent.add(line); return line;
  }
  function circle(radius, material, parent = sculpture) {
    return path(Array.from({ length: 161 }, (_, i) => new THREE.Vector3(Math.cos(i / 160 * Math.PI * 2) * radius, Math.sin(i / 160 * Math.PI * 2) * radius, 0)), material, parent);
  }
  circle(2.14, lineMaterial(cyan, .25));
  const rings = [1.92, 1.57, 1.22].map((radius, i) => {
    const ring = circle(radius, lineMaterial(i === 1 ? acid : cyan, i === 2 ? .4 : .75));
    ring.rotation.set([.95, -.75, .4][i], [.3, -.6, 1.15][i], 0);
    const satellite = new THREE.Mesh(new THREE.IcosahedronGeometry(.06, 1), new THREE.MeshStandardMaterial({ color: i === 1 ? acid : cyan, emissive: i === 1 ? acid : cyan, emissiveIntensity: .5, metalness: .5, roughness: .25 }));
    ring.add(satellite);
    const trailPoints = Array.from({ length: 41 }, (_, j) => {
      const a = -j / 40 * .65;
      return new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0);
    });
    const trail = path(trailPoints, lineMaterial(i === 1 ? acid : cyan, .6), ring);
    const colors = [];
    trailPoints.forEach((_, j) => { const color = new THREE.Color(i === 1 ? acid : cyan).multiplyScalar((1 - j / 40) * .9 + .05); colors.push(color.r, color.g, color.b); });
    trail.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    trail.material.vertexColors = true;
    return { ring, satellite, trail, radius };
  });
  const tickPoints = [];
  for (let i = 0; i < 96; i++) {
    const angle = i / 96 * Math.PI * 2;
    [i % 8 === 0 ? 2.01 : 2.09, 2.14].forEach(radius => tickPoints.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0)));
  }
  const ticks = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(tickPoints), lineMaterial(cyan, .45)); sculpture.add(ticks);

  // A physical processor package: bevelled substrate, raised die, pins and routed traces.
  const processor = new THREE.Group(); sculpture.add(processor);
  const shape = new THREE.Shape();
  shape.moveTo(-.61, -.7); shape.lineTo(.61, -.7); shape.quadraticCurveTo(.7, -.7, .7, -.61);
  shape.lineTo(.7, .61); shape.quadraticCurveTo(.7, .7, .61, .7); shape.lineTo(-.61, .7);
  shape.quadraticCurveTo(-.7, .7, -.7, .61); shape.lineTo(-.7, -.61); shape.quadraticCurveTo(-.7, -.7, -.61, -.7);
  const packageGeometry = new THREE.ExtrudeGeometry(shape, { depth: .14, bevelEnabled: true, bevelSize: .035, bevelThickness: .03, bevelSegments: 2, steps: 1, curveSegments: 4 });
  const packageMesh = new THREE.Mesh(packageGeometry, new THREE.MeshStandardMaterial({ color: 0x14201c, roughness: .36, metalness: .75 }));
  processor.add(packageMesh);
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(packageGeometry, 25), lineMaterial(cyan, .55)); processor.add(edge);
  const die = new THREE.Mesh(new THREE.BoxGeometry(1.02, 1.02, .07), new THREE.MeshStandardMaterial({ color: 0x132117, metalness: .7, roughness: .25 }));
  die.position.z = .22; processor.add(die);
  const dieEdge = new THREE.LineSegments(new THREE.EdgesGeometry(die.geometry), lineMaterial(acid, .8)); die.add(dieEdge);
  const pinGeometry = new THREE.BoxGeometry(.16, .048, .055);
  const pinMaterial = new THREE.MeshStandardMaterial({ color: cyan, metalness: .7, roughness: .3 });
  for (let side = 0; side < 4; side++) {
    const bank = new THREE.Group(); bank.rotation.z = side * Math.PI / 2; processor.add(bank);
    for (let i = 0; i < 7; i++) {
      const y = (i - 3) * .16;
      const pin = new THREE.Mesh(pinGeometry, pinMaterial); pin.position.set(.81, y, .06); bank.add(pin);
      const endX = 1.05 + (i % 3) * .12;
      path([new THREE.Vector3(.88, y, .03), new THREE.Vector3(endX, y, .03), new THREE.Vector3(endX + .13, y * 1.35, .03)], lineMaterial(cyan, .18), bank);
    }
  }
  const impactRing = circle(.4, lineMaterial(acid, 0));
  let impactAt = 0, entranceCleanup, entered = false;
  let introPlayed = hero.introPlayed || false;
  try { introPlayed = sessionStorage.getItem('stem2connect-orbit-intro-v2') === '1'; } catch { /* Optional persistence. */ }
  if (hero.forceIntro || new URLSearchParams(location.search).get('intro') === '1') introPlayed = false;
  function finishEntrance() { delete hero.dataset.intro; sculpture.scale.setScalar(1); }
  stage.draw = ({ now, elapsed }) => {
    if (!entered) {
      entered = true;
      if (!introPlayed) {
        try { sessionStorage.setItem('stem2connect-orbit-intro-v2', '1'); } catch { /* Optional persistence. */ }
        entranceCleanup = meteorEntrance(hero, machine, () => { impactAt = performance.now(); }, finishEntrance);
      }
    }
    const { x, y, scroll } = stage.input;
    sculpture.rotation.y += (x * .18 - sculpture.rotation.y) * .07;
    sculpture.rotation.x += (-y * .13 - sculpture.rotation.x) * .07;
    processor.rotation.set(Math.sin(elapsed * .18) * .06, Math.sin(elapsed * .14) * .08, scroll * .00025);
    ticks.rotation.z = scroll * .0007;
    rings.forEach(({ ring, satellite, trail, radius }, i) => {
      ring.rotation.z = scroll * [.003, -.004, .002][i];
      const angle = elapsed * (.17 + i * .035) + i * 2.1;
      satellite.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
      trail.rotation.z = angle;
    });
    if (hero.dataset.intro === 'flight') sculpture.scale.setScalar(.68);
    if (impactAt) {
      const p = Math.min((now - impactAt) / 1000, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      impactRing.scale.setScalar(1 + p * 8);
      impactRing.material.opacity = (1 - p) * .75;
      sculpture.scale.setScalar(.68 + ease * .32);
      if (p === 1) impactAt = 0;
    }
  };
  machine.classList.add('has-webgl');
  stage.onDispose(() => { entranceCleanup?.(); finishEntrance(); machine.classList.remove('has-webgl'); });
  batchStaticMeshes(processor);
  await stage.start();
  return stage.dispose;
}

// One short, skippable 3D entrance. The transparent overlay never intercepts navigation.
function meteorEntrance(hero, machine, impact, finish) {
  const background = !!hero.canvas;
  const visibilitySource = background ? hero : document;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: background ? hero.canvas : undefined, alpha: true, antialias: false, powerPreference: 'low-power' }); }
  catch { finish(); return () => {}; }
  renderer.debug.checkShaderErrors = false;
  renderer.setPixelRatio(Math.min(background ? hero.dpr : devicePixelRatio, 1));
  const canvas = renderer.domElement; if (!background) { canvas.className = 'meteor-canvas'; canvas.setAttribute('aria-hidden', 'true'); }
  const skip = background ? hero.skip : document.createElement('button'); skip.type = 'button'; skip.className = 'intro-skip'; skip.textContent = 'Skip animation';
  hero.append(canvas, skip); hero.dataset.intro = 'flight';
  const width = hero.clientWidth, height = hero.clientHeight;
  renderer.setSize(width, height, false);
  const camera = new THREE.OrthographicCamera(0, width, height, 0, .1, 1000); camera.position.z = 500;
  const scene = new THREE.Scene(); lighting(scene);
  const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(13, 0), new THREE.MeshStandardMaterial({ color: 0x18251f, emissive: 0x4cf4dc, emissiveIntensity: .28, metalness: .6, roughness: .4, flatShading: true }));
  rock.add(new THREE.LineSegments(new THREE.EdgesGeometry(rock.geometry), new THREE.LineBasicMaterial({ color: 0xd8ff37 })));
  scene.add(rock);
  const trail = new THREE.Mesh(new THREE.ConeGeometry(6, 120, 5), new THREE.MeshBasicMaterial({ color: 0x4cf4dc, transparent: true, opacity: .3, depthWrite: false })); scene.add(trail);
  const ripple = new THREE.Mesh(new THREE.RingGeometry(1, 1.012, 96), new THREE.MeshBasicMaterial({ color: 0x4cf4dc, transparent: true, opacity: 0, side: THREE.DoubleSide })); scene.add(ripple);
  let raf = 0, stopped = false, hit = false;
  const began = performance.now();
  function cleanup() {
    if (stopped) return;
    stopped = true; cancelAnimationFrame(raf); finish();
    const focused = !background && document.activeElement === skip;
    scene.traverse(object => { object.geometry?.dispose(); object.material?.dispose(); });
    renderer.dispose(); renderer.forceContextLoss(); if (!background) canvas.remove(); skip.remove();
    visibilitySource.removeEventListener('visibilitychange', visibility);
    if (focused) hero.querySelector('a')?.focus({ preventScroll: true });
  }
  function visibility() { if (visibilitySource.hidden) cleanup(); }
  visibilitySource.addEventListener('visibilitychange', visibility);
  skip.addEventListener('click', cleanup);
  function draw(now) {
    if (stopped) return;
    const age = now - began;
    if (age > 1950) { cleanup(); return; }
    const bounds = hero.getBoundingClientRect(), targetBounds = machine.getBoundingClientRect();
    const target = new THREE.Vector3(targetBounds.left - bounds.left + targetBounds.width / 2, height - (targetBounds.top - bounds.top + targetBounds.height / 2), 0);
    const start = new THREE.Vector3(Math.max(15, target.x - width * .65), Math.min(height - 5, target.y + (background ? hero.viewportHeight : innerHeight) * .64), 0);
    const p = Math.min(age / 900, 1), eased = p * p;
    rock.position.copy(start).lerp(target, eased);
    rock.rotation.set(age * .002, age * .003, age * .001);
    const direction = target.clone().sub(start).normalize();
    trail.position.copy(rock.position).addScaledVector(direction, -60);
    trail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
    trail.scale.setScalar(.5 + p * .5);
    if (p === 1) {
      if (!hit) { hit = true; hero.dataset.intro = 'impact'; impact(); }
      rock.visible = trail.visible = false;
      const q = Math.min((age - 900) / 1050, 1);
      ripple.position.copy(target); ripple.scale.setScalar(12 + q * Math.min(width, 650)); ripple.material.opacity = (1 - q) * .5;
    }
    renderer.render(scene, camera);
    if (hero.flushFrames) renderer.getContext().flush();
    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);
  return cleanup;
}

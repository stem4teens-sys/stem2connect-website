import * as THREE from './assets/vendor/three.module.min.js';
import { createStage, lighting } from './three-stage.js';

export async function mountMolecules(host, reduced) {
  const stage = createStage(host, 'molecular-canvas', reduced);
  if (!stage) return;
  lighting(stage.scene);
  const group = new THREE.Group(); stage.scene.add(group);
  const colors = [0xaa0000, 0x00bf62, 0xfdde5b];
  const materials = colors.map(color => new THREE.MeshStandardMaterial({ color, roughness: .3, metalness: .15 }));
  const bondMaterial = new THREE.MeshStandardMaterial({ color: 0xdbd6ca, roughness: .5, metalness: .25 });
  const atomGeometry = new THREE.SphereGeometry(.115, 16, 12);
  const bondGeometry = new THREE.CylinderGeometry(.025, .025, 1, 8);
  const up = new THREE.Vector3(0, 1, 0);
  function atom(parent, point, material, size = 1) {
    const sphere = new THREE.Mesh(atomGeometry, material);
    sphere.position.copy(point); sphere.scale.setScalar(size); parent.add(sphere);
  }
  function bond(parent, a, b) {
    const cylinder = new THREE.Mesh(bondGeometry, bondMaterial);
    cylinder.position.copy(a).add(b).multiplyScalar(.5);
    cylinder.scale.y = a.distanceTo(b);
    cylinder.quaternion.setFromUnitVectors(up, b.clone().sub(a).normalize());
    parent.add(cylinder);
  }
  const molecule = new THREE.Group(); group.add(molecule);
  const points = Array.from({ length: 6 }, (_, i) => {
    const angle = i / 6 * Math.PI * 2;
    return new THREE.Vector3(Math.cos(angle) * .58, Math.sin(angle) * .58, Math.sin(i * 1.9) * .14);
  });
  points.forEach((point, i) => {
    atom(molecule, point, materials[i % 3]); bond(molecule, point, points[(i + 1) % 6]);
    if (i % 2 === 0) {
      const end = point.clone().multiplyScalar(1.65);
      bond(molecule, point, end); atom(molecule, end, materials[(i + 1) % 3], .65);
    }
  });
  const helix = new THREE.Group(); group.add(helix);
  let previous = [];
  for (let i = 0; i < 13; i++) {
    const angle = i * .56;
    const pair = [0, Math.PI].map(offset => new THREE.Vector3(Math.cos(angle + offset) * .38, (i - 6) * .18, Math.sin(angle + offset) * .38));
    pair.forEach((point, side) => {
      atom(helix, point, materials[side], .7);
      if (i) bond(helix, previous[side], point);
    });
    bond(helix, pair[0], pair[1]); previous = pair;
  }
  stage.resize = () => {
    const halfWidth = Math.tan(THREE.MathUtils.degToRad(21)) * stage.camera.position.z * stage.camera.aspect;
    // Place each model in the existing space beside the centered, unchanged logo.
    const compact = stage.width < 360;
    molecule.position.set(-halfWidth * (compact ? .88 : .76), .06, -.3);
    helix.position.set(halfWidth * (compact ? .88 : .78), 0, -.3);
    molecule.scale.setScalar(compact ? .5 : .8);
    helix.scale.setScalar(compact ? .65 : .92);
  };
  stage.resize();
  stage.draw = ({ elapsed }) => {
    group.rotation.y += (stage.input.x * .15 - group.rotation.y) * .07;
    group.rotation.x += (-stage.input.y * .1 - group.rotation.x) * .07;
    molecule.rotation.set(.24, elapsed * .12 + stage.input.scroll * .0015, -.22);
    helix.rotation.set(0, -elapsed * .13 + stage.input.scroll * .002, -.16);
  };
  await stage.start();
  return stage.dispose;
}

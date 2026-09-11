import * as THREE from './assets/vendor/three.module.min.js';

// Combine fixed siblings only. Animated groups and students keep their transforms.
export function batchStaticMeshes(root) {
  for (const child of [...root.children]) if (child.isGroup) batchStaticMeshes(child);
  const groups = new Map();
  for (const object of root.children) {
    if (!object.isMesh || object.isInstancedMesh || object.children.length || !object.visible ||
        Array.isArray(object.material) || object.material.transparent ||
        object.geometry.drawRange.start !== 0 || object.geometry.drawRange.count !== Infinity ||
        Object.keys(object.geometry.morphAttributes).length) continue;
    const attributes = Object.entries(object.geometry.attributes).map(([name, attribute]) =>
      `${name}:${attribute.itemSize}:${attribute.normalized}`).sort().join('|');
    const key = `${object.material.id}:${object.renderOrder}:${attributes}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(object);
  }
  for (const objects of groups.values()) {
    if (objects.length < 2) continue;
    objects.forEach(object => object.updateMatrix());
    let batch;
    if (objects.every(object => object.geometry === objects[0].geometry)) {
      batch = new THREE.InstancedMesh(objects[0].geometry, objects[0].material, objects.length);
      objects.forEach((object, index) => batch.setMatrixAt(index, object.matrix));
      batch.instanceMatrix.needsUpdate = true;
      batch.computeBoundingSphere();
    } else {
      const parts = objects.map(object => object.geometry.clone().applyMatrix4(object.matrix));
      const total = parts.reduce((sum, part) => sum + part.attributes.position.count, 0);
      const geometry = new THREE.BufferGeometry();
      for (const [name, attribute] of Object.entries(parts[0].attributes)) {
        const values = new attribute.array.constructor(total * attribute.itemSize);
        let offset = 0;
        for (const part of parts) { values.set(part.attributes[name].array, offset); offset += part.attributes[name].array.length; }
        geometry.setAttribute(name, new THREE.BufferAttribute(values, attribute.itemSize, attribute.normalized));
      }
      const count = parts.reduce((sum, part) => sum + (part.index?.count ?? part.attributes.position.count), 0);
      const indices = total > 65535 ? new Uint32Array(count) : new Uint16Array(count);
      let offset = 0, vertex = 0;
      for (const part of parts) {
        const count = part.index?.count ?? part.attributes.position.count;
        for (let i = 0; i < count; i++) indices[offset++] = vertex + (part.index ? part.index.getX(i) : i);
        vertex += part.attributes.position.count;
        part.dispose();
      }
      geometry.setIndex(new THREE.BufferAttribute(indices, 1));
      geometry.computeBoundingSphere();
      batch = new THREE.Mesh(geometry, objects[0].material);
    }
    batch.renderOrder = objects[0].renderOrder;
    root.remove(...objects); root.add(batch);
  }
}

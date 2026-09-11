import * as THREE from './assets/vendor/three.module.min.js';

// All seven figures share three meshes. Individual colours and poses are instance data.
export function createStudents(parent, locations, coordinate) {
  const geometries = {
    round: new THREE.SphereGeometry(1, 10, 8),
    box: new THREE.BoxGeometry(1, 1, 1),
    limb: new THREE.CylinderGeometry(1, 1, 1, 8)
  };
  const batches = Object.fromEntries(Object.keys(geometries).map(key => [key, []]));
  const figures = [];
  const skins = [0x9e6547, 0xf1c49d, 0xbc8156, 0x69402e, 0xd8a578, 0xe5b48e, 0x8e563b];
  const shirts = [0xa82024, 0xf3ecd9, 0xd7ac47, 0x46765b, 0xa82024, 0xf3ecd9, 0xd7ac47];
  const dummy = new THREE.Object3D();
  const up = new THREE.Vector3(0, 1, 0);
  function part(figure, type, color, position, scale, rotation = 0) {
    const piece = { figure, position, scale, rotation, index: batches[type].length, type, color };
    batches[type].push(piece); return piece;
  }
  function limb(figure, color, a, b, radius) {
    const delta = new THREE.Vector3(...b).sub(new THREE.Vector3(...a));
    const piece = part(figure, 'limb', color, a.map((value, i) => (value + b[i]) / 2), [radius, delta.length(), radius]);
    piece.quaternion = new THREE.Quaternion().setFromUnitVectors(up, delta.normalize());
    return piece;
  }
  locations.forEach(([latitude, longitude], index) => {
    const root = new THREE.Object3D();
    root.position.copy(coordinate(latitude, longitude, 1.641));
    // A gentle outward lean keeps even the southern figures standing upright.
    const standing = root.position.clone().normalize().multiplyScalar(.75).addScaledVector(up, .8).normalize();
    const facing = new THREE.Vector3(.92, .12, .39);
    facing.addScaledVector(standing, -facing.dot(standing)).normalize();
    const right = standing.clone().cross(facing).normalize();
    root.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, standing, facing));
    root.scale.setScalar(1.16);
    root.updateMatrix();
    const figure = { root, waving: index !== 2 && index !== 4, phase: index * 1.7, arm: [] };
    figures.push(figure);
    const skin = skins[index], shirt = shirts[index];
    // Sneakers, separate trouser legs, a rounded sweatshirt and a tiny collar.
    [-1, 1].forEach(side => {
      part(figure, 'round', 0xf3ecd9, [side * .035, .018, .014], [.029, .018, .043]);
      limb(figure, 0x28362f, [side * .035, .039, 0], [side * .028, .145, 0], .023);
    });
    part(figure, 'round', shirt, [0, .197, 0], [.074, .077, .047]);
    part(figure, 'round', skin, [0, .274, 0], [.025, .022, .024]);
    part(figure, 'round', skin, [0, .322, .006], [.052, .058, .048]);
    part(figure, 'round', index % 3 === 0 ? 0x38271e : 0x211c19, [0, .35, -.009], [.054, .035, .048]);
    if (index % 2) part(figure, 'round', 0x38271e, [.032, .327, -.047], [.031, .057, .027]);
    // Faces point out from each figure, with a small nose and dark eyes.
    [-1, 1].forEach(side => part(figure, 'round', 0x211c19, [side * .019, .326, .049], [.005, .006, .003]));
    part(figure, 'round', skin, [0, .312, .053], [.009, .009, .01]);
    // Backpack and straps make the silhouettes read as students.
    part(figure, 'round', index % 2 ? 0xa82024 : 0xc7a452, [0, .205, -.056], [.052, .062, .03]);
    [-1, 1].forEach(side => part(figure, 'box', 0xd2b775, [side * .044, .223, .04], [.009, .07, .008]));
    limb(figure, shirt, [-.061, .235, 0], [-.079, .177, .026], .023);
    limb(figure, skin, [-.079, .177, .026], [-.046, .162, .068], .017);
    part(figure, 'round', skin, [-.046, .162, .068], [.021, .018, .018]);
    const book = part(figure, 'box', index % 2 ? 0xc09a46 : 0x43664d, [-.038, .181, .076], [.07, .086, .018], -.13);
    part(figure, 'box', 0xfff6df, [-.038, .181, .087], [.057, .07, .003], book.rotation);
    if (figure.waving) {
      figure.arm = [
        limb(figure, shirt, [.059, .235, 0], [.109, .282, 0], .023),
        limb(figure, skin, [.109, .282, 0], [.133, .345, .006], .016),
        part(figure, 'round', skin, [.133, .358, .006], [.021, .029, .012]),
        part(figure, 'round', skin, [.114, .35, .009], [.01, .015, .011])
      ];
      figure.arm.forEach(piece => { piece.wave = true; });
    } else {
      limb(figure, shirt, [.061, .235, 0], [.079, .18, .035], .023);
      limb(figure, skin, [.079, .18, .035], [.003, .175, .077], .016);
      part(figure, 'round', skin, [.003, .175, .077], [.021, .018, .018]);
    }
  });
  const surface = new THREE.MeshPhongMaterial({ color: 0xffffff, specular: 0x473c2e, shininess: 16 });
  const meshes = {};
  const pivot = new THREE.Vector3(.067, .24, 0);
  const rotation = new THREE.Matrix4(), toPivot = new THREE.Matrix4().makeTranslation(...pivot.toArray());
  const fromPivot = new THREE.Matrix4().makeTranslation(...pivot.clone().negate().toArray());
  const result = new THREE.Matrix4();
  function setPiece(piece, time) {
    dummy.position.set(...piece.position); dummy.scale.set(...piece.scale);
    dummy.quaternion.identity();
    if (piece.quaternion) dummy.quaternion.copy(piece.quaternion);
    else dummy.rotation.z = piece.rotation;
    dummy.updateMatrix();
    if (piece.wave) {
      rotation.makeRotationZ(Math.sin(time * 2.4 + piece.figure.phase) * .18);
      result.copy(toPivot).multiply(rotation).multiply(fromPivot).multiply(dummy.matrix);
    } else result.copy(dummy.matrix);
    result.premultiply(piece.figure.root.matrix);
    meshes[piece.type].setMatrixAt(piece.index, result);
  }
  Object.entries(batches).forEach(([type, pieces]) => {
    const batch = new THREE.InstancedMesh(geometries[type], surface, pieces.length);
    // Instances remain within the globe's known extent; a fixed bound avoids per-frame scans.
    batch.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 2.2);
    batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    parent.add(batch); meshes[type] = batch;
    pieces.forEach(piece => { batch.setColorAt(piece.index, new THREE.Color(piece.color)); setPiece(piece, 0); });
    batch.instanceColor.needsUpdate = true;
    batch.instanceMatrix.needsUpdate = true;
  });
  return time => {
    figures.forEach(figure => figure.arm.forEach(piece => setPiece(piece, time)));
    meshes.round.instanceMatrix.needsUpdate = true;
    meshes.limb.instanceMatrix.needsUpdate = true;
  };
}

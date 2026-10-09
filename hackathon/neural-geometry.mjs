// Analytic geometry shared by the first-paint SVG and the interactive canvas.
// No model, textures, WebGL context or runtime dependency is needed.
export function buildField(compact = false) {
  const paths = [];
  const strands = compact ? 32 : 48;
  const segments = compact ? 96 : 128;
  for (let i = 0; i < strands; i++) {
    const phase = i / strands * Math.PI * 2;
    const points = [];
    for (let j = 0; j <= segments; j++) {
      const t = j / segments * Math.PI * 2;
      const twist = phase + t * 2;
      const minor = 39 + Math.sin(t * 3 + phase) * 5;
      const radius = 141 + Math.cos(twist) * minor;
      points.push([Math.cos(t) * radius, Math.sin(t) * radius, Math.sin(twist) * minor]);
    }
    paths.push(points);
  }
  return paths;
}
export function projection(rx = .92, ry = -.16, rz = -.37) {
  const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
  return point => {
    const [x, y, z] = point;
    const y1 = y * cx - z * sx, z1 = y * sx + z * cx;
    const x2 = x * cy + z1 * sy, z2 = -x * sy + z1 * cy;
    const scale = 780 / (780 - z2);
    return [300 + (x2 * cz - y1 * sz) * scale * 1.32, 294 + (x2 * sz + y1 * cz) * scale * 1.32, z2];
  };
}

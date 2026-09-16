import * as T from '../vendor/three.module.js';

/** Bake only static meshes into material batches. Moving groups stay independent. */
export function batchStatic(root, exclude = []) {
  root.updateMatrixWorld(true);
  const inverse = root.matrixWorld.clone().invert();
  const buckets = new Map();
  const originals = new Set();
  const excluded = new Set(exclude);
  const walk = object => {
    if (excluded.has(object) || object.isInstancedMesh || object.isSkinnedMesh) return;
    if (object.isMesh && object.visible && !Array.isArray(object.material)) {
      const key = `${object.material.uuid}/${object.castShadow}/${object.receiveShadow}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(object);
    }
    for (const child of object.children) walk(child);
  };
  walk(root);
  let removed = 0, batches = 0;
  for (const objects of buckets.values()) {
    if (objects.length < 2) continue;
    const parts = objects.map(object => {
      const geo = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
      geo.applyMatrix4(new T.Matrix4().multiplyMatrices(inverse, object.matrixWorld));
      if (!geo.attributes.normal) geo.computeVertexNormals();
      return geo;
    });
    const count = parts.reduce((sum, geo) => sum + geo.attributes.position.count, 0);
    const positions = new Float32Array(count * 3);
    const normals = new Float32Array(count * 3);
    const uv = new Float32Array(count * 2);
    let offset = 0;
    for (const geo of parts) {
      const p = geo.attributes.position, n = geo.attributes.normal, t = geo.attributes.uv;
      for (let i = 0; i < p.count; i++) {
        positions.set([p.getX(i), p.getY(i), p.getZ(i)], (offset + i) * 3);
        normals.set([n.getX(i), n.getY(i), n.getZ(i)], (offset + i) * 3);
        if (t) uv.set([t.getX(i), t.getY(i)], (offset + i) * 2);
      }
      offset += p.count;
      geo.dispose();
    }
    const geometry = new T.BufferGeometry();
    geometry.setAttribute('position', new T.BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new T.BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new T.BufferAttribute(uv, 2));
    geometry.computeBoundingSphere();
    const mesh = new T.Mesh(geometry, objects[0].material);
    mesh.castShadow = objects[0].castShadow;
    mesh.receiveShadow = objects[0].receiveShadow;
    mesh.name = 'static-material-batch';
    root.add(mesh);
    for (const object of objects) {
      originals.add(object.geometry);
      object.removeFromParent();
    }
    removed += objects.length;
    batches++;
  }
  const stillUsed = new Set();
  root.traverse(object => { if (object.geometry) stillUsed.add(object.geometry); });
  for (const geometry of originals) if (!stillUsed.has(geometry)) geometry.dispose();
  return { sourceMeshes: removed, batches };
}

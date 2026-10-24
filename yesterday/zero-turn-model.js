import * as THREE from './assets/three.module.js';

// Original detailed zero-turn geometry, metres, front -X and Y-up.
// All tires and the folding rollover bar retain independent animation pivots.
const sources = new Map();

async function source(base) {
  if (!sources.has(base)) sources.set(base, (async () => {
    const [metadataResponse, bufferResponse] = await Promise.all([
      fetch(`${base}zero-turn.json`), fetch(`${base}zero-turn.bin.gz`),
    ]);
    if (!metadataResponse.ok || !bufferResponse.ok) throw new Error('Detailed mower assets are unavailable');
    const metadata = await metadataResponse.json();
    const buffer = await new Response(bufferResponse.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    const root = new THREE.Group();
    root.name = 'Original detailed commercial zero-turn mower';
    root.userData = {asset:'original-detailed-zero-turn', faces:'-X', footprint:metadata.footprint, height:metadata.height, workingHeight:metadata.workingHeight, authored:true};
    const materials = {};
    for (const [key, spec] of Object.entries(metadata.materials)) {
      const material = new THREE.MeshPhysicalMaterial({
        name:key, color:new THREE.Color(...spec.color), metalness:spec.metalness,
        roughness:spec.roughness, clearcoat:spec.clearcoat ?? 0,
        clearcoatRoughness:spec.clearcoatRoughness ?? .25,
      });
      material.userData = {authoredFinish:true, preserveFinish:true};
      materials[key] = material;
    }
    const groups = {};
    for (const [key, spec] of Object.entries(metadata.groups)) {
      const group = new THREE.Group();
      group.name = spec.wheel ? `Wheel • ${key}` : spec.rolloverBar ? 'Folding rollover bar' : 'Mower body';
      group.position.set(...spec.position);
      if (spec.wheel) group.userData.wheelRadius = spec.radius;
      if (spec.rolloverBar) group.userData.rolloverBar = true;
      group.userData.partGroup = key;
      groups[key] = group; root.add(group);
    }
    for (const {name, group, material, offset, count, indices} of metadata.meshes) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(buffer,offset,count*3),3));
      geometry.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(buffer,offset+count*12,count*3),3));
      geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(buffer,offset+count*24,count*2),2));
      geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(buffer,offset+count*32,indices),1));
      geometry.computeBoundingSphere();
      const mesh = new THREE.Mesh(geometry,materials[material]);
      mesh.name = name; mesh.castShadow = mesh.receiveShadow = true;
      groups[group].add(mesh);
    }
    return {root, metadata};
  })().catch(error => { sources.delete(base); throw error; }));
  return sources.get(base);
}

export async function loadZeroTurnModel({base='assets/zero-turn/', folded=true}={}) {
  const {root} = await source(base);
  const model = root.clone(true);
  model.traverse(part => { if(part.userData.rolloverBar) part.rotation.z = folded ? -Math.PI/2 : 0; });
  return model;
}

export async function replaceZeroTurnModel(target, options={}) {
  const model = await loadZeroTurnModel(options);
  target.clear();
  target.name = model.name;
  target.userData = {...target.userData, ...model.userData};
  for (const child of [...model.children]) target.add(child);
  return target;
}

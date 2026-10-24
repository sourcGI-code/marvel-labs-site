import * as THREE from './assets/three.module.js';
import {loadSuppliedBiomass} from './biomass-assets.js?v=1';

// Shared source assets for the material library and retained trailer journey.
// The owning scene supplies lighting, placement and reversible animation.
export async function createBiomassSpecimens(renderer) {
  const supplied=await loadSuppliedBiomass(renderer);
  let seed = 618;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const TAU = Math.PI * 2;
  const groups = Object.fromEntries(['coffee'].map(name => {
    const g = new THREE.Group(); g.name = `Biomass / ${name}`; return [name, g];
  }));
  function material(name, color, roughness = .65) {
    const m = new THREE.MeshStandardMaterial({ color, roughness, metalness: .035, side: THREE.DoubleSide, envMapIntensity: .65 });
    m.name = `biomass-${name}`; return m;
  }
  function add(group, geometry, material) {
    const mesh = new THREE.Mesh(geometry, material); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return mesh;
  }
  // Fine grounds form an organic mound. Instancing is capped at 2,800 granules;
  // a continuous, textured core prevents gaps without loading thousands more.
  const groundsMaterial = material('coffee-granules', 0x67452e, .93);
  const granules = new THREE.InstancedMesh(new THREE.SphereGeometry(.02, 7, 5), groundsMaterial, 2800);
  granules.name = '2,800 instanced coffee granules';
  const dummy = new THREE.Object3D(), color = new THREE.Color();
  for (let i = 0; i < 2800; i++) {
    const angle = random() * TAU, radius = Math.sqrt(random()) * 1.02;
    const height = Math.pow(Math.max(0, 1 - radius * radius / 1.0404), 1.3) * .7;
    dummy.position.set(Math.cos(angle) * radius, -.31 + height + random() * .019, Math.sin(angle) * radius);
    dummy.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
    dummy.scale.set(.65 + random() * .7, .5 + random() * .6, .65 + random() * .7); dummy.updateMatrix(); granules.setMatrixAt(i, dummy.matrix);
    color.setHSL(.065 + random() * .023, .35 + random() * .18, .32 + random() * .24); granules.setColorAt(i, color);
  }
  granules.castShadow = true; granules.receiveShadow = true; groups.coffee.add(granules);
  const noiseSize = 128, noiseData = new Uint8Array(noiseSize * noiseSize * 4);
  for (let i = 0; i < noiseData.length; i += 4) {
    const n = 67 + random() * 170; noiseData[i] = noiseData[i + 1] = noiseData[i + 2] = n; noiseData[i + 3] = 255;
  }
  const noise = new THREE.DataTexture(noiseData, noiseSize, noiseSize, THREE.RGBAFormat);
  noise.wrapS = noise.wrapT = THREE.RepeatWrapping; noise.repeat.set(5, 3);
  noise.magFilter = THREE.LinearFilter; noise.minFilter = THREE.LinearMipmapLinearFilter; noise.generateMipmaps = true; noise.needsUpdate = true;
  const coreMaterial = material('coffee-core', 0x34231a, .96); coreMaterial.bumpMap = noise; coreMaterial.bumpScale = .026;
  const profile = [new THREE.Vector2(0, -.34), new THREE.Vector2(.83, -.34), new THREE.Vector2(1.02, -.31)];
  for (let i = 1; i <= 48; i++) {
    const r = (1 - i / 48) * 1.02;
    profile.push(new THREE.Vector2(r, -.31 + Math.pow(Math.max(0, 1 - r * r / 1.0404), 1.3) * .7));
  }
  add(groups.coffee, new THREE.LatheGeometry(profile, 72), coreMaterial);

  // Uniform scale is baked into child transforms, leaving every returned root
  // centred at zero with scale=1 for straightforward scene choreography.
  for (const [name, g] of Object.entries(groups)) {
    g.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(g), size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
    const scale = 2.1 / Math.max(size.x, size.y, size.z);
    for (const child of g.children) {
      child.position.sub(center).multiplyScalar(scale); child.scale.multiplyScalar(scale);
    }
    g.userData = { specimen: name, illustrative: true, dimensions: size.multiplyScalar(scale).toArray(), seed: 618 };
  }
  return {...supplied,...groups};
}

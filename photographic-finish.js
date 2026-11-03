import * as THREE from 'three';
import {RGBELoader} from 'three/addons/loaders/RGBELoader.js';

// The same photographed reflection environment as the approved Blender proof.
// It is assigned to product materials only, keeping the existing reserve stage.
export async function createPhotographicFinish(renderer) {
  const source = await new RGBELoader().loadAsync(new URL('./assets/photographic-reserve-v1/courtyard-reflections.hdr', import.meta.url).href);
  source.mapping = THREE.EquirectangularReflectionMapping;
  const generator = new THREE.PMREMGenerator(renderer);
  const environment = generator.fromEquirectangular(source);
  environment.texture.name = 'Approved photographic graphite reflections';
  source.dispose(); generator.dispose();
  return material => {
    if ('envMap' in material) {
      material.envMap = environment.texture;
      material.envMapIntensity = 1;
      material.userData.approvedTrailerFinish = 'photographic-site-v1';
      material.needsUpdate = true;
    }
    return material;
  };
}

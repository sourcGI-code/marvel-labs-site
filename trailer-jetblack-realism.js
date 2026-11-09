import * as THREE from 'three';
import {RGBELoader} from 'three/addons/loaders/RGBELoader.js';
import {materialRole,applyFinish} from './trailer-jetblack-materials.js?v=dark-stage-20261108';
import {addSurfaceDetail} from './trailer-surface-detail.js?v=studio-v3';
import {refineTrailerWheels,refineWheelMaterial} from './trailer-wheel-detail.js?v=wheel-detail-20261108';
export async function createTrailerEnvironment(renderer,{daylight=false}={}){
  const hdr=await new RGBELoader().setDataType(THREE.FloatType).loadAsync('./assets/photographic-reserve-v1/courtyard-reflections.hdr');
  // Preserve photographed light structure while removing coloured buildings
  // from the reflection tint. Black paint stays neutral under the studio keys.
  const pixels=hdr.image.data;
  for(let i=0;i<pixels.length;i+=4){
    const luminance=pixels[i]*.2126+pixels[i+1]*.7152+pixels[i+2]*.0722;
    // A dark studio ceiling keeps the upper shell black; the photographed
    // horizon still supplies varied reflections to the sides and running gear.
    const row=Math.floor(i/4/hdr.image.width)/hdr.image.height;
    const ceiling=daylight?.60+.40*THREE.MathUtils.smoothstep(row,.35,.62):.07+.93*THREE.MathUtils.smoothstep(row,.47,.55);
    for(let c=0;c<3;c++)pixels[i+c]=(luminance*.92+pixels[i+c]*.08)*ceiling;
  }
  hdr.mapping=THREE.EquirectangularReflectionMapping;hdr.needsUpdate=true;
  const generator=new THREE.PMREMGenerator(renderer),target=generator.fromEquirectangular(hdr);
  hdr.dispose();generator.dispose();return target;
}

export function prepareTrailerMaterials(gltf,renderer,selection){
  const root=gltf.scene,materials=[],made=new Map();
  refineTrailerWheels(root);
  root.traverse(mesh=>{
    if(!mesh.isMesh)return;
    const convert=source=>{
      const role=materialRole(source.name,mesh.name,source.userData.colourStudioRole),wheel=/filmwheel/.test(mesh.name.replace(/[^a-z0-9]/gi,'').toLowerCase()),key=source.uuid+'/'+role+'/'+(wheel?'wheel':'body');
      if(made.has(key))return made.get(key);
      const material=source.isMeshPhysicalMaterial?source.clone():new THREE.MeshPhysicalMaterial();
      if(!source.isMeshPhysicalMaterial)THREE.MeshStandardMaterial.prototype.copy.call(material,source);
      material.name=source.name;material.side=THREE.DoubleSide;
      material.flatShading=false;material.envMapIntensity=.8;
      material.opacity=1;material.transparent=false;material.transmission=0;material.depthWrite=true;
      // Preserve the supplied normals, texture maps and physical material
      // extensions, including the separately authored metal and tire finishes.
      if(role==='decal'){
        // Use the exact supplied artwork's alpha as an ink mask. Discard its
        // baked white/cyan RGB so grey or green applies to text AND underline.
        material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n diffuseColor.rgb = diffuse;');};
        material.customProgramCacheKey=()=> 'marvel-single-ink-v1';
        if(material.map){material.map.anisotropy=Math.min(16,renderer.capabilities.getMaxAnisotropy());material.map.needsUpdate=true;}
      }
      if(role==='body'||role==='rubber')addSurfaceDetail(material,role==='body'?'paint':'rubber');
      refineWheelMaterial(material,mesh.name);
      material.userData.colourStudioRole=role;
      materials.push({material,role,authored:material.clone()});made.set(key,material);return material;
    };
    mesh.material=Array.isArray(mesh.material)?mesh.material.map(convert):convert(mesh.material);
    const roles=(Array.isArray(mesh.material)?mesh.material:[mesh.material]).map(m=>m.userData.colourStudioRole);
    mesh.castShadow=!roles.every(r=>r==='decal'||r==='stripe');mesh.receiveShadow=true;
    mesh.userData.colourStudioOverlay=roles.every(r=>r==='decal'||r==='stripe');
    if(roles.includes('decal'))mesh.renderOrder=2;
  });
  applyFinish(materials,selection);
  return materials;
}

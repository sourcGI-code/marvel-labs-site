import * as THREE from 'three';
import {RGBELoader} from 'three/addons/loaders/RGBELoader.js';
export async function createStudioFinish(renderer){
 const source=await new RGBELoader().setDataType(THREE.FloatType).loadAsync('assets/photographic-reserve-v1/courtyard-reflections.hdr');
 const {data,width,height}=source.image,copy=data.slice();
 const quarter=location.search.includes('debug3d')?Number(new URLSearchParams(location.search).get('reflect')??0):0;
 const shift=Math.round(width*quarter/4);
 // Neutralize the sky's blue cast, matching the daylight proof's white balance.
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const target=(y*width+x)*4,from=(y*width+(x+shift)%width)*4;
  data[target]=copy[from]*1.06;data[target+1]=copy[from+1];data[target+2]=copy[from+2]*.83;data[target+3]=copy[from+3];
 }
 source.needsUpdate=true;source.mapping=THREE.EquirectangularReflectionMapping;
 const pmrem=new THREE.PMREMGenerator(renderer),environment=pmrem.fromEquirectangular(source);environment.texture.name='Neutral photographic studio reflections';
 source.dispose();pmrem.dispose();
 return material=>{if('envMap'in material){material.envMap=environment.texture;material.envMapIntensity=1.05;material.needsUpdate=true;}return material;};
}

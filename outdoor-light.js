import * as THREE from './assets/three.module.js';
import {RGBELoader} from './assets/RGBELoader.js';

// One daylight setup for the entire worksite, with real contact shadows and
// outdoor reflections instead of the floating product studio's light panels.
export async function outdoorLight(scene,renderer){
 const lights=[];scene.traverse(o=>{if(o.isLight)lights.push(o);});lights.forEach(o=>o.removeFromParent());
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;
 scene.add(new THREE.HemisphereLight(0xdde9f4,0x7b805f,.30));
 const sun=new THREE.DirectionalLight(0xfff1d9,3.0);sun.position.set(-26,35,-18);sun.target.position.set(0,0,10);scene.add(sun,sun.target);
 sun.castShadow=true;const shadowSize=Math.min(renderer.capabilities.maxTextureSize,4096);sun.shadow.mapSize.set(shadowSize,shadowSize);
 Object.assign(sun.shadow.camera,{left:-35,right:35,top:40,bottom:-28,near:1,far:130});sun.shadow.normalBias=.018;sun.shadow.bias=-.00012;sun.shadow.radius=2;
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=512;
 const ctx=canvas.getContext('2d'),gradient=ctx.createLinearGradient(0,0,0,512);
 for(const [at,color] of [[0,'#416f9f'],[.40,'#739ec1'],[.5,'#bacdde'],[.58,'#6f7d65'],[1,'#424f3b']])gradient.addColorStop(at,color);
 ctx.fillStyle=gradient;ctx.fillRect(0,0,1024,512);
 const background=new THREE.CanvasTexture(canvas);background.colorSpace=THREE.SRGBColorSpace;background.mapping=THREE.EquirectangularReflectionMapping;
 let texture=background;
 try{texture=await new RGBELoader().loadAsync('assets/yard/suburban-field-2k.hdr');}catch{ /* The local sky remains usable if the HDR asset cannot load. */ }
 texture.mapping=THREE.EquirectangularReflectionMapping;
 const pmrem=new THREE.PMREMGenerator(renderer),environment=pmrem.fromEquirectangular(texture);scene.environment=environment.texture;pmrem.dispose();
 // Use the photograph for light and reflections. Its buildings cannot be used
 // as the visible horizon because their scale conflicts with this property.
 scene.environmentIntensity=.85;scene.background=background;scene.backgroundIntensity=1;scene.fog=new THREE.Fog(0xc3d4df,100,220);
 return {restore(){scene.background=background;}};
}

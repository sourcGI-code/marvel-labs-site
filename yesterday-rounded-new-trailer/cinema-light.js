import * as THREE from './assets/three.module.js';
import {brandTrailer} from './fleet-branding.js?v=4';
import {addTrailerDetails} from './trailer-details.js?v=2';
// Reflections and self-shadowing carry the rendered-film look into the live model.
export function cinemaLight(scene,renderer){
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
 scene.add(new THREE.HemisphereLight(0xc6d5df,0x1b2329,.42));
 const rig=new THREE.Group(),target=new THREE.Object3D();target.position.set(0,1,0);rig.add(target);scene.add(rig);
 const key=new THREE.DirectionalLight(0xf2f5f5,3.0);key.position.set(-3,9,-5);key.target=target;key.castShadow=true;
 key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-11,right:11,top:12,bottom:-9,near:.1,far:45});key.shadow.normalBias=.016;key.shadow.bias=-.00012;key.shadow.radius=3;rig.add(key);
 const rim=new THREE.DirectionalLight(0x9bcedf,2.2);rim.position.set(5,6,5);rim.target=target;rig.add(rim);
 const fill=new THREE.DirectionalLight(0xf2dec7,.6);fill.position.set(-6,3,3);fill.target=target;rig.add(fill);
 const environment=new THREE.Scene();environment.background=new THREE.Color(.035,.045,.055);
 const softbox=document.createElement('canvas');softbox.width=256;softbox.height=16;
 const context=softbox.getContext('2d'),gradient=context.createLinearGradient(0,0,256,0);
 for(const [stop,color] of [[0,'#080b0d'],[.22,'#677780'],[.5,'#eff9ff'],[.82,'#eff9ff'],[1,'#75848c']])gradient.addColorStop(stop,color);
 context.fillStyle=gradient;context.fillRect(0,0,256,16);
 const reflection=new THREE.CanvasTexture(softbox);reflection.colorSpace=THREE.SRGBColorSpace;
 for(const [x,y,z,w,h,intensity,tx,ty,tz] of [[-4,10,-1,14,5,8,-4,0,0],[-9,4,-7,11,3,5,-5,1,0],[-2,5,5,12,2,14,-3,1,0],[-14,5,3,7,5,6,-10,1,0],[5,5,12,22,12,5,0,1,0]]){
  const panel=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(intensity,intensity,intensity),map:z===12?reflection:null,side:THREE.DoubleSide}));panel.position.set(x,y,z);panel.lookAt(tx,ty,tz);environment.add(panel);
 }
 const pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(environment,.04).texture;pmrem.dispose();reflection.dispose();environment.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});
 return {rig};
}
const surfaces=new Map(),surfaceSources=new Map();
async function finishMap(kind,scale,renderer){
 const key=`${kind}-${scale}`;
 if(!surfaceSources.has(kind))surfaceSources.set(kind,new THREE.TextureLoader().loadAsync(`assets/surfaces/${kind}.png`));
 if(!surfaces.has(key))surfaces.set(key,surfaceSources.get(kind).then(source=>{
  const texture=source.clone();
  texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.setScalar(scale);
  texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return texture;
 }).catch(()=>null));
 return surfaces.get(key);
}
function meterUV(geometry){
 if(geometry.attributes.uv)return;
 const p=geometry.attributes.position,n=geometry.attributes.normal,uv=new Float32Array(p.count*2);
 for(let i=0;i<p.count;i++){
  const x=Math.abs(n.getX(i)),y=Math.abs(n.getY(i)),z=Math.abs(n.getZ(i));
  // Same axes as the Blender material mapping: X, -Z, Y.
  uv[i*2]=x>y&&x>z?-p.getZ(i):p.getX(i);
  uv[i*2+1]=y>x&&y>z?-p.getZ(i):p.getY(i);
 }
 geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));
}
export async function finishTrailer(root,renderer,model=null){
 const [powder,brushed,rubber]=await Promise.all([finishMap('powder',4,renderer),finishMap('brushed',2,renderer),finishMap('rubber',4,renderer)]);
 const materials=new Map();root.traverse(o=>{if(!o.isMesh||o.userData.fleetGraphic)return;o.castShadow=o.receiveShadow=true;const old=o.material;if(!old?.isMeshStandardMaterial)return;if(old.name==='Warm white print'){o.visible=false;return;}
 meterUV(o.geometry);
 if(!materials.has(old)){
  const m=new THREE.MeshPhysicalMaterial({name:old.name,color:old.color,metalness:old.metalness,roughness:old.roughness,side:old.side,clearcoat:/graphite|aluminum|steel/i.test(old.name)?.28:0,clearcoatRoughness:.2,envMapIntensity:.7});
  if(/graphite/i.test(old.name)){m.roughness=.42;m.roughnessMap=m.bumpMap=powder;m.bumpScale=.00035;}
  else if(/aluminum|steel/i.test(old.name)){m.roughness=.34;m.roughnessMap=m.bumpMap=brushed;m.bumpScale=.00022;}
  else if(/rubber/i.test(old.name)){m.roughness=.86;m.roughnessMap=m.bumpMap=rubber;m.bumpScale=.00064;}
  materials.set(old,m);
 }o.material=materials.get(old);
 });
 for(const old of materials.keys())old.dispose();
 await brandTrailer(root);
 if(model)addTrailerDetails(model);
}
export async function finishTruck(root,renderer){
 const [paint,rubber]=await Promise.all([finishMap('paint',10,renderer),finishMap('rubber',8,renderer)]),materials=new Map();
 root.traverse(o=>{if(!o.isMesh||o.userData.fleetGraphic)return;o.castShadow=o.receiveShadow=true;const old=o.material;
  if(!materials.has(old)){
   if(old.userData.vehicleFinish?.authoredFinish){const m=old.clone();m.envMapIntensity=1;materials.set(old,m);o.material=m;return;}
   const m=new THREE.MeshPhysicalMaterial({name:old.name,color:old.color,map:old.map,metalness:.45,roughness:.28,side:old.side,clearcoat:.65,clearcoatRoughness:.14,bumpMap:paint,bumpScale:.00032,roughnessMap:paint});
   if(['cabine','porte-g'].includes(old.name))m.color.setRGB(.12,.17,.19);
   if(['benne','porte-benne','rangement'].includes(old.name))m.color.setRGB(.055,.075,.085);
   if(old.name==='roue'){m.metalness=.04;m.roughness=.86;m.clearcoat=0;m.bumpMap=m.roughnessMap=rubber;m.bumpScale=.00064;}
   if(old.name==='mat.8'){m.color.setRGB(.006,.012,.016);m.metalness=.28;m.roughness=.075;m.clearcoat=.9;m.map=m.bumpMap=m.roughnessMap=null;}
   const supplied=old.userData.vehicleFinish;
   if(supplied?.preserveFinish){m.metalness=.25;m.roughness=.65;m.clearcoat=supplied.clearcoat??.3;m.clearcoatRoughness=supplied.clearcoatRoughness??.2;m.envMapIntensity=.6;m.bumpMap=null;m.normalMap=old.normalMap;m.metalnessMap=old.metalnessMap;m.roughnessMap=old.roughnessMap;}
   materials.set(old,m);
  }o.material=materials.get(old);
 });
 for(const old of materials.keys())old.dispose();
}

// Metre-scaled finish maps for manufactured equipment, shared by its loadout clones.
export async function finishEquipment(roots,renderer){
 const [paint,rubber,brushed]=await Promise.all([finishMap('powder',6,renderer),finishMap('rubber',8,renderer),finishMap('brushed',3,renderer)]);
 const replacements=new Map();
 for(const root of roots)root.traverse(o=>{
  if(!o.isMesh||o.userData.fleetGraphic)return;meterUV(o.geometry);
  const old=o.material;
  if(!replacements.has(old)){
   if(old.userData.authoredFinish){
    const material=old.clone();material.envMapIntensity=.85;
    material.bumpMap=/rubber|upholstery/i.test(old.name)?rubber:paint;material.bumpScale=.00016;replacements.set(old,material);
   }else if(o.userData.authoredEquipment){
    const name=old.name,soft=/plastic|fabric|string|paper/i.test(name),metal=/aluminum|steel|metal/i.test(name);
    const color=old.color.clone();if(/white_plastic/.test(name))color.setRGB(.60,.62,.58);if(color.r+color.g+color.b<.008)color.setRGB(.012,.015,.014);
    const material=new THREE.MeshPhysicalMaterial({name,color,map:old.map,normalMap:old.normalMap,roughnessMap:old.roughnessMap,metalnessMap:old.metalnessMap,side:old.side,
     metalness:soft?0:/red/i.test(name)?.22:metal?.82:old.metalness,
     roughness:/fabric|paper|string/i.test(name)?.9:/plastic/i.test(name)?.62:/aluminum/i.test(name)?.46:.33,
     clearcoat:/red/i.test(name)?.45:0,clearcoatRoughness:.25,envMapIntensity:.65});
    material.bumpMap=soft?rubber:/aluminum|steel/i.test(name)?brushed:paint;material.bumpScale=soft?.00038:.00016;
    replacements.set(old,material);
   }else{
   const soft=/rubber|black/.test(old.name),metal=/silver|steel/.test(old.name);
   const m=new THREE.MeshPhysicalMaterial({name:old.name,color:old.color,metalness:soft?0:metal?.8:.35,roughness:soft?.88:metal?.32:.36,clearcoat:soft||metal?0:.4,clearcoatRoughness:.24,envMapIntensity:.55});
   m.bumpMap=m.roughnessMap=soft?rubber:metal?brushed:paint;m.bumpScale=soft?.0007:.0002;
   replacements.set(old,m);
   }
  }
  o.material=replacements.get(old);
 });
}

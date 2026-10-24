import * as THREE from './assets/three.module.js';
import {packedBuffer} from './packed-assets.js';

let truckAsset;
async function createTruckAsset(renderer){
 const authored=new URLSearchParams(location.search).has('authored-assets');
 const folder=authored?'/_authoring/pickup/':'assets/opening/';
 const [meta,data]=await Promise.all([
  fetch(folder+'truck.json?v=ford-3').then(r=>{if(!r.ok)throw Error('Truck manifest unavailable');return r.json();}),
  packedBuffer(folder+'truck.bin')
 ]);
 const loader=new THREE.TextureLoader(),materials={},root=new THREE.Group(),groups={},textures=new Map();
 async function texture(file,color=false){
  if(!file)return null;
  if(!textures.has(file))textures.set(file,loader.loadAsync(`${folder}${meta.webTextures?.[file]||file}${meta.webTextures?.[file]?'?v=2':''}`));
  const map=await textures.get(file);map.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return map;
 }
 await Promise.all(Object.entries(meta.materials).map(async([name,m])=>{
  const [map,normalMap,metalnessMap,roughnessMap]=await Promise.all([texture(m.texture,true),texture(m.normalTexture),texture(m.metalnessTexture),texture(m.roughnessTexture)]);
  materials[name]=new THREE.MeshPhysicalMaterial({name,color:new THREE.Color(...(m.authoredFinish?m.color??[1,1,1]:[.006,.007,.008])),map,normalMap,metalnessMap,roughnessMap,metalness:m.metalness??.15,roughness:m.roughness??.6,side:THREE.DoubleSide,transparent:(m.opacity??1)<1,opacity:m.opacity??1,clearcoat:m.clearcoat??0,clearcoatRoughness:m.clearcoatRoughness??.2,transmission:m.transmission??0,emissive:new THREE.Color(...(m.emissive??[0,0,0])),emissiveIntensity:m.emissiveIntensity??1});
  materials[name].userData.vehicleFinish=m;
 }));
 for(const m of meta.meshes){
  const {offset,count,indices}=m,g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(data,offset,count*3),3));
  g.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(data,offset+count*12,count*3),3));
  g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(data,offset+count*24,count*2),2));
  g.setIndex(new THREE.BufferAttribute(new Uint32Array(data,offset+count*32,indices),1));g.computeBoundingSphere();
  const mesh=new THREE.Mesh(g,materials[m.material]);mesh.name=m.name;
  const group=m.group??'body';
  if(!groups[group]){groups[group]=new THREE.Group();groups[group].name=group;groups[group].position.fromArray(meta.groups?.[group]?.position??[0,0,0]);root.add(groups[group]);}
  groups[group].add(mesh);
 }
 if(meta.receiverHeight){
  const steel=new THREE.MeshStandardMaterial({color:0x394146,metalness:.8,roughness:.35});
  const drop=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,meta.receiverHeight-.55,16),steel);
  drop.name='Illustrative drop receiver';drop.position.set(meta.rear[0]-.045,(meta.receiverHeight+.55)/2,0);root.add(drop);
 }
 root.name='Black Ford pickup';return {root,meta,groups};
}

export async function loadTruck(renderer){
 truckAsset??=createTruckAsset(renderer).catch(error=>{truckAsset=undefined;throw error;});
 const source=await truckAsset,root=source.root.clone(true),materials=new Map(),groups={};
 root.traverse(o=>{if(o.isMesh){if(!materials.has(o.material))materials.set(o.material,o.material.clone());o.material=materials.get(o.material);}});
 for(const id of Object.keys(source.groups))groups[id]=root.getObjectByName(id);
 return {root,meta:source.meta,groups};
}


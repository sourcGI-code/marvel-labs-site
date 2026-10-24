import * as THREE from './assets/three.module.js';
import {suppliedTrailerParts} from './supplied-trailer-body.js?v=11';

const sources=new Map();
async function source(feet,optimized){
 const key=`${feet}${optimized?'-web':''}`;
 if(!sources.has(key))sources.set(key,Promise.all([
  fetch(new URL(`./assets/film/trailer-${key}.json`,import.meta.url)).then(r=>{if(!r.ok)throw Error('Model manifest unavailable');return r.json();}),
  fetch(new URL(`./assets/film/trailer-${key}.bin`,import.meta.url)).then(r=>{if(!r.ok)throw Error('Model geometry unavailable');return r.arrayBuffer();})
 ]));
 return sources.get(key);
}
export async function createCargoModel(feet=20,{optimized=false}={}){
 const [[manifest,data],parts]=await Promise.all([source(feet,optimized),suppliedTrailerParts(feet)]),root=new THREE.Group();
 root.name=`Marvel_Labs_${feet}ft_Supplied_Trailer`;
 root.userData.suppliedTrailer=true;
 root.userData.sourceAsset='autonomous trailer 3d model.glb';
 root.userData.dimensionStatus='Nominal configuration label; supplied exterior proportions preserved, not certified dimensions';
 for(const part of Object.values(parts))root.add(part);
 const exteriorBounds=new THREE.Box3().setFromObject(root);
 const cargoBounds=new THREE.Box3().setFromObject(parts.cargoRoof);
 const rearBounds=new THREE.Box3().setFromObject(parts.rear);
 const moduleIds=['intake','formulation','forming','quality'];
 for(const entry of manifest.meshes){
  const {group,material,offset,count,indices}=entry,m=manifest.materials[material];
  // Keep the existing illustrative production equipment, never the old shell,
  // frame, hitch, wheels, fenders or deck outside the supplied body.
  if(!moduleIds.includes(group))continue;
  if(!parts[group]){parts[group]=new THREE.Group();parts[group].name=group;root.add(parts[group]);}
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(data,offset,count*3),3));
  geometry.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(data,offset+count*12,count*3),3));
  geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(data,offset+count*24,indices),1));geometry.computeBoundingSphere();
  const surface=new THREE.MeshStandardMaterial({color:new THREE.Color(...m.color),metalness:m.metalness,roughness:m.roughness,side:THREE.DoubleSide});
  if(m.emission>0){surface.emissive.copy(surface.color);surface.emissiveIntensity=m.emission*.35;}
  const mesh=new THREE.Mesh(geometry,surface);mesh.castShadow=true;mesh.receiveShadow=true;mesh.name=material;parts[group].add(mesh);
 }
 const modules=moduleIds.map(id=>parts[id]).filter(Boolean);
 const moduleBounds=new THREE.Box3();for(const group of modules)moduleBounds.union(new THREE.Box3().setFromObject(group));
 const originalSize=moduleBounds.getSize(new THREE.Vector3());
 const margin=.045,available=new THREE.Vector3(
  Math.max(.1,cargoBounds.max.x-cargoBounds.min.x-margin*2),
  Math.max(.1,cargoBounds.min.y-rearBounds.min.y-margin*2),
  Math.max(.1,exteriorBounds.max.z-exteriorBounds.min.z-margin*4)
 );
 const moduleScale=Math.min(1,available.x/originalSize.x,available.y/originalSize.y,available.z/originalSize.z);
 const oldCenter=moduleBounds.getCenter(new THREE.Vector3());
 const offset=new THREE.Vector3((cargoBounds.min.x+cargoBounds.max.x)/2-oldCenter.x*moduleScale,rearBounds.min.y+margin-moduleBounds.min.y*moduleScale,-oldCenter.z*moduleScale);
 for(const group of modules){group.scale.setScalar(moduleScale);group.position.copy(offset);}
 const restPositions=new Map(Object.values(parts).map(part=>[part,part.position.clone()]));
 const inspectionPoints=modules.map(group=>new THREE.Box3().setFromObject(group).getCenter(new THREE.Vector3()));
 const smooth=THREE.MathUtils.smoothstep;
 function fade(group,value){if(!group)return;group.visible=value<.999;group.traverse(mesh=>{if(!mesh.isMesh)return;for(const material of [mesh.material].flat()){material.transparent=value>0;material.opacity=1-value;material.depthWrite=value<.1;}});}
 function setState(open=0,explode=0,frame=0){
  for(const [id,group] of Object.entries(parts)){
   group.position.copy(restPositions.get(group));let opacity=0;
   if(['cargoNear','cargoFar','cargoRoof','rear'].includes(id)){
    opacity=smooth(open,.3,1);
    if(id==='cargoRoof')group.position.y+=open*1.7;
    else if(id==='rear')group.position.x+=open*.4;
    else {group.position.z+=open*(id==='cargoNear'?-1.5:1.5);group.position.y+=open*.26;}
   }else if(modules.includes(group)){
    const index=modules.indexOf(group);group.position.y+=explode*(.38+index*.09)+frame*2.7;opacity=smooth(frame,.1,1);
   }
   fade(group,opacity);
   // Fully enclosed equipment cannot be seen. Avoid drawing it (and its
   // shadows) until the enclosure starts separating.
   if(modules.includes(group) && open<=.001 && frame<=.001)group.visible=false;
  }
  root.userData.state={open,explode,frame};
 }
 setState();return {root,parts,modules,inspectionPoints,length:manifest.length,setState};
}

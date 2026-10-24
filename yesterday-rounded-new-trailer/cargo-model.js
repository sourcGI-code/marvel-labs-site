import * as THREE from './assets/three.module.js';

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
 const [manifest,data]=await source(feet,optimized),root=new THREE.Group(),parts={};
 root.name=`Marvel_Labs_${feet}ft_Production_Concept`;
 for(const entry of manifest.meshes){
  const {group,material,offset,count,indices}=entry,m=manifest.materials[material];
  if(!parts[group]){parts[group]=new THREE.Group();parts[group].name=group;root.add(parts[group]);}
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(new Float32Array(data,offset,count*3),3));
  geometry.setAttribute('normal',new THREE.BufferAttribute(new Float32Array(data,offset+count*12,count*3),3));
  geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(data,offset+count*24,indices),1));geometry.computeBoundingSphere();
  const surface=new THREE.MeshStandardMaterial({color:new THREE.Color(...m.color),metalness:m.metalness,roughness:m.roughness,side:THREE.DoubleSide});
  if(m.emission>0){surface.emissive.copy(surface.color);surface.emissiveIntensity=m.emission*.35;}
  const mesh=new THREE.Mesh(geometry,surface);mesh.castShadow=true;mesh.receiveShadow=true;mesh.name=material;parts[group].add(mesh);
 }
 const modules=['intake','formulation','forming','quality'].map(id=>parts[id]);
 const smooth=THREE.MathUtils.smoothstep;
 function fade(group,value){if(!group)return;group.visible=value<.999;group.children.forEach(mesh=>{mesh.material.transparent=value>0;mesh.material.opacity=1-value;mesh.material.depthWrite=value<.1;});}
 function setState(open=0,explode=0,frame=0){
  for(const [id,group] of Object.entries(parts)){
   group.position.set(0,0,0);let opacity=0;
   if(['near','far','roof','front','rear'].includes(id)){
    opacity=smooth(open,.3,1);
    if(id==='roof')group.position.y=open*1.7;
    else if(id==='front')group.position.x=-open*.4;
    else {group.position.z=open*(id==='near'?-1.5:1.5);group.position.y=open*.26;}
   }else if(modules.includes(group)){
    const index=modules.indexOf(group);group.position.y=explode*(.38+index*.09)+frame*2.7;opacity=smooth(frame,.1,1);
   }else if(id==='deck'){group.position.y=frame*.8;opacity=smooth(frame,.1,1);}
   fade(group,opacity);
   // Fully enclosed equipment cannot be seen. Avoid drawing it (and its
   // shadows) until the enclosure starts separating.
   if(modules.includes(group) && open<=.001 && frame<=.001)group.visible=false;
  }
  root.userData.state={open,explode,frame};
 }
 setState();return {root,parts,modules,length:manifest.length,setState};
}

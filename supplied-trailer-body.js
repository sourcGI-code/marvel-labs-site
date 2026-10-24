import * as THREE from './assets/three.module.js';
import {GLTFLoader} from './assets/GLTFLoader.js';
const assets=new Map();
export const suppliedTrailerURL=feet=>new URL(`./assets/autonomous-trailer/marvel-v4/trailer-${feet}-rig.glb?v=1`,import.meta.url).href;
export function prepareSuppliedMaterials(root){
 root.traverse(mesh=>{if(!mesh.isMesh)return;
  const prepare=source=>{const material=source.clone();
   // Retain the reviewed wheel finish while exposing the original editor's
   // rubber/label controls for the new material names and exact PNG logo.
   if(material.userData.marvelFinishSlot==='wheel_tire')material.userData.marvelPaletteSlot='rubber';
   if(material.userData.marvelWordmarkSource)material.userData.marvelPaletteSlot='label';
   return material;
  };
  mesh.material=Array.isArray(mesh.material)?mesh.material.map(prepare):prepare(mesh.material);
  mesh.castShadow=mesh.receiveShadow=true;mesh.userData.suppliedTrailerSurface=true;
 });
}
export function suppliedTireFloor(model){
 model.updateMatrixWorld(true);let support=Infinity;const point=new THREE.Vector3();
 model.traverse(mesh=>{if(!mesh.isMesh)return;
  const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material],geometry=mesh.geometry,position=geometry.attributes.position;
  const tire=material=>['rubber','wheel_tire'].includes(material?.userData.marvelFinishSlot);
  if(!materials.some(tire))return;
  for(const group of geometry.groups.length?geometry.groups:[{start:0,count:geometry.index?.count||position.count,materialIndex:0}]){
   if(!tire(materials[group.materialIndex]))continue;
   for(let i=group.start;i<group.start+group.count;i++){
    point.fromBufferAttribute(position,geometry.index?geometry.index.getX(i):i).applyMatrix4(mesh.matrixWorld);support=Math.min(support,point.y);
   }
  }
 });
 return Number.isFinite(support)?support:new THREE.Box3().setFromObject(model).min.y;
}
export async function suppliedTrailerParts(feet){
 if(!assets.has(feet))assets.set(feet,new GLTFLoader().loadAsync(suppliedTrailerURL(feet)));
 const source=(await assets.get(feet)).scene.clone(true),parts={};
 source.updateMatrixWorld(true);
 source.traverse(node=>{if(node.userData.rigPart)parts[node.userData.rigPart]=node;});
 for(const [name,part] of Object.entries(parts)){
  part.removeFromParent();part.name=name;
  // Each rig part owns its materials: fading a cargo roof must not fade a wall.
  prepareSuppliedMaterials(part);
 }
 if(!parts.base||!parts.rear||!parts.cargoRoof)throw Error('Supplied trailer rig is missing a required part.');
 const scale=(2.555/.42196655)*(feet/20),length=feet*.3048,rear=length/2,partition=-length/2+8*.3048,inner=.20935*scale-.03,floor=parts.rear.userData.floorHeight??.1366634*scale,ceiling=.414*scale,factoryFront=rear-.4782*scale-.28*scale;
 function lining(part,name,points,color=0xb3bdba,indices=[0,1,2,0,2,3]){
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));geometry.setIndex(indices);geometry.computeVertexNormals();
  const material=new THREE.MeshStandardMaterial({name:'Interior / '+name,color,roughness:.62,metalness:.08,side:THREE.FrontSide});
  const mesh=new THREE.Mesh(geometry,material);mesh.name=name;mesh.userData.suppliedInteriorLiner=true;mesh.castShadow=mesh.receiveShadow=true;parts[part].add(mesh);
 }
 function sideLining(zone,side,x0,x1,z){
  const radius=.064*scale,cy=.080*scale,offset=rear-.4782*scale,axles=[.065,.177].map(x=>x*scale+offset),xs=new Set([x0,x1]);
  for(const axle of axles)for(let i=0;i<=32;i++){const x=axle+radius*Math.cos(Math.PI*i/32);if(x>x0&&x<x1)xs.add(x);}
  const points=[],indices=[];
  for(const x of [...xs].sort((a,b)=>a-b)){
   const bottom=Math.max(floor,...axles.filter(axle=>Math.abs(x-axle)<=radius).map(axle=>cy+Math.sqrt(Math.max(0,radius**2-(x-axle)**2))));
   points.push([x,bottom,z],[x,ceiling,z]);
  }
  for(let i=0;i<points.length-2;i+=2)indices.push(...(side==='Near'?[i,i+2,i+3,i,i+3,i+1]:[i,i+3,i+2,i,i+1,i+3]));
  lining(zone+side,zone+' '+side.toLowerCase()+' lining',points,0xb3bdba,indices);
 }
 for(const [zone,x0,x1] of [['factory',factoryFront,partition],['cargo',partition,rear]]){
  sideLining(zone,'Near',x0,x1,-inner);
  sideLining(zone,'Far',x0,x1,inner);
  lining(zone+'Roof',zone+' ceiling lining',[[x0,ceiling,-inner],[x1,ceiling,-inner],[x1,ceiling,inner],[x0,ceiling,inner]]);
 }
 const doorHalf=Math.min(inner-.04,1.10);
 lining('rear','Non-slip rear ramp inner face',[[rear-.025,floor,-doorHalf],[rear-.025,floor,doorHalf],[rear-.025,ceiling,doorHalf],[rear-.025,ceiling,-doorHalf]],0x222d30);
 return parts;
}
